import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/database.mjs';
import { DevelopmentAuthProvider } from '../server/auth.mjs';
import { createApplication } from '../server/application.mjs';

test('Portrait changes require a session, use an allowed choice and affect only the current account', async () => {
  const store = openDatabase(':memory:', { seed: false });
  try {
    const app = createApplication({ store, provider: new DevelopmentAuthProvider(store) });
    let cookie;
    const call = (path, method = 'GET', body) => app.handle(new Request(`http://127.0.0.1:4173/api/${path}`, { method, headers: { origin: 'http://127.0.0.1:4173', ...(cookie ? { cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    assert.equal((await call('profile/avatar', 'PUT', { avatarId: 'orc' })).status, 401);
    const login = await call('auth/register', 'POST', { username: 'portrait_player', password: 'Portrait-test-password' });
    cookie = login.headers.get('set-cookie').split(';')[0];
    const { account } = await login.json();
    const other = store.identityAccount('test', { subject: 'other', username: 'Other player' });
    assert.equal((await call('profile/avatar', 'PUT', { avatarId: '../../unsafe.png' })).status, 400);
    assert.equal(store.account(account.id).avatarId, null);
    const saved = await call('profile/avatar', 'PUT', { avatarId: 'night-elf', accountId: other.id });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).account.avatarId, 'night-elf');
    assert.equal(store.account(other.id).avatarId, null);
    assert.equal((await (await call('auth/session')).json()).account.avatarId, 'night-elf');
    assert.equal((await call('profile/avatar', 'PUT', {})).status, 400);
    assert.equal(store.account(account.id).avatarId, 'night-elf');
    for (const avatarUrl of ['javascript:alert(1)', 'data:image/png;base64,aaa', 'http://example.com/portrait.png', 'https://user:password@example.com/image.png']) {
      assert.equal((await call('profile/avatar', 'PUT', { avatarId: 'custom', avatarUrl })).status, 400);
    }
    assert.equal((await call('profile/avatar', 'PUT', { avatarId: 'custom', avatarUrl: 'https://example.com/portrait.png' })).status, 200);
    const custom = (await (await call('auth/session')).json()).account;
    assert.equal(custom.avatarId, 'custom');
    assert.equal(custom.avatarUrl, 'https://example.com/portrait.png');
    await call('profile/avatar', 'PUT', { avatarId: 'orc' });
    assert.equal(store.account(account.id).avatarUrl, null);
  } finally { store.close(); }
});
