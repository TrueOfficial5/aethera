import test from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../dist/js/auth-service.js';
import { accountPage } from '../dist/js/pages.js';

test('A failed initial connection can recover without locking the sign-in form', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
    await authService.refresh();
    assert.equal(authService.state.authentication.retryable, true);
    const html = accountPage();
    assert.match(html, /data-auth-retry/);
    assert.doesNotMatch(html, /type="submit" disabled/);
    const recovered = { account: { username: 'Adventurer', role: 'user', createdAt: '2026-11-01T12:00:00Z' }, authentication: { available: true, message: 'Local testing' } };
    globalThis.fetch = async () => Response.json(recovered);
    await authService.signIn({ username: 'Adventurer', password: 'example-password' });
    assert.equal(authService.state.account.username, 'Adventurer');
    assert.match(accountPage(), /<h2>Adventurer<\/h2>/);
  } finally { globalThis.fetch = original; }
});
