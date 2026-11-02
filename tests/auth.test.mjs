import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/database.mjs';
import { DevelopmentAuthProvider } from '../server/auth.mjs';
import { createApplication } from '../server/application.mjs';

test('Local accounts use hashed passwords, server roles, persistent sessions and logout', async () => {
  const store = openDatabase(':memory:', { seed: false });
  try {
    const app = createApplication({ store, provider: new DevelopmentAuthProvider(store) });
    const call = (path, body, cookie, origin = 'http://127.0.0.1:4173') => app.handle(new Request(`http://127.0.0.1:4173/api/${path}`, { method: body ? 'POST' : 'GET', headers: { origin, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    const credentials = { username: 'test_adventurer', password: 'A-long-test-password', role: 'admin' };
    const registered = await call('auth/register', credentials);
    assert.equal(registered.status, 200);
    assert.equal((await registered.json()).account.role, 'user');
    const stored = store.db.prepare('SELECT * FROM local_credentials').get();
    assert.match(stored.password_hash, /^scrypt:/);
    assert.notEqual(stored.password_hash, credentials.password);
    const cookie = registered.headers.get('set-cookie').split(';')[0];
    assert.match(registered.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
    assert.equal((await (await call('auth/session', null, cookie)).json()).account.username, credentials.username);
    assert.equal((await call('admin/news', null, cookie)).status, 403);
    assert.equal((await call('admin/news')).status, 401);
    assert.equal((await call('auth/login', { ...credentials, password: 'wrong' })).status, 401);
    assert.equal((await call('auth/login', credentials, null, 'https://attacker.example')).status, 403);
    store.setRole(stored.account_id, 'admin');
    assert.equal((await call('admin/news', null, cookie)).status, 200);
    await call('auth/logout', {}, cookie);
    assert.equal((await (await call('auth/session', null, cookie)).json()).account, null);
    const login = await call('auth/login', credentials);
    assert.equal(login.status, 200);
    const nextCookie = login.headers.get('set-cookie').split(';')[0];
    store.db.prepare('UPDATE sessions SET expires_at=0').run();
    assert.equal((await (await call('auth/session', null, nextCookie)).json()).account, null);
  } finally { store.close(); }
});

test('Authentication remains unavailable without an explicitly configured provider', async () => {
  const store = openDatabase(':memory:', { seed: false });
  try {
    const app = createApplication({ store });
    const result = await app.handle(new Request('http://127.0.0.1:4173/api/auth/login', { method: 'POST', headers: { origin: 'http://127.0.0.1:4173', 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'test', password: 'password' }) }));
    assert.equal(result.status, 503);
  } finally { store.close(); }
});
