import test from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../dist/js/auth-service.js';
import { profilePage } from '../dist/js/management.js';

test('Profile preview hides private details and management controls', () => {
  const previous = authService.state.account;
  try {
    authService.state.account = { username: '<Player>', email: 'private@example.test', role: 'admin', createdAt: '2026-11-01T12:00:00Z' };
    const privateView = profilePage();
    assert.ok(privateView.includes('private@example.test'));
    assert.ok(!privateView.includes('data-sign-out'));
    assert.ok(privateView.includes('Manage news'));
    assert.ok(privateView.includes('&lt;Player&gt;'));
    assert.ok(!privateView.includes('<Player>'));
    const publicView = profilePage(true);
    for (const value of ['private@example.test', 'data-sign-out', '#/admin', 'Account details']) assert.ok(!publicView.includes(value));
    assert.ok(publicView.includes('Public profile preview'));
    assert.ok(publicView.includes('No game server is connected yet.'));
    authService.state.account.role = 'user';
    assert.ok(!profilePage().includes('#/admin'));
    authService.state.account = null;
    assert.ok(profilePage(true).includes('Sign in to continue.'));
    assert.ok(!profilePage(true).includes('&lt;Player&gt;'));
  } finally {
    authService.state.account = previous;
  }
});
