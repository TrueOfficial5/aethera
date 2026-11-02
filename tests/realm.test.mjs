import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/database.mjs';
import { DevelopmentAuthProvider } from '../server/auth.mjs';
import { createApplication } from '../server/application.mjs';

test('Realm information is public, but edits require admin permission and a current version', async () => {
  const store = openDatabase(':memory:', { seed: false });
  try {
    const app = createApplication({ store, provider: new DevelopmentAuthProvider(store) });
    let cookie;
    const call = (path, method = 'GET', body) => app.handle(new Request(`http://127.0.0.1:4173/api/${path}`, { method, headers: { origin: 'http://127.0.0.1:4173', ...(cookie ? { cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    const { realm } = await (await call('realm')).json();
    const changed = { ...realm, name: 'Test realm', experience: '5×', maxLevel: 70, status: 'Testing' };
    assert.equal((await call('admin/realm', 'PUT', changed)).status, 401);
    const login = await call('auth/register', 'POST', { username: 'realm_editor', password: 'Realm-testing-password' });
    cookie = login.headers.get('set-cookie').split(';')[0];
    const { account } = await login.json();
    assert.equal((await call('admin/realm', 'PUT', changed)).status, 403);
    store.setRole(account.id, 'admin');
    assert.equal((await call('admin/realm', 'PUT', { ...changed, maxLevel: 0 })).status, 400);
    assert.equal((await call('admin/realm', 'PUT', { ...changed, name: '' })).status, 400);
    assert.equal((await call('admin/realm', 'PUT', changed)).status, 200);
    const saved = (await (await call('realm')).json()).realm;
    assert.equal(saved.name, 'Test realm');
    assert.equal(saved.experience, '5×');
    assert.equal(saved.maxLevel, 70);
    assert.equal(saved.status, 'Testing');
    assert.equal(saved.version, realm.version + 1);
    assert.equal((await call('admin/realm', 'PUT', changed)).status, 409);
  } finally { store.close(); }
});
