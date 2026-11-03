import test from 'node:test';
import assert from 'node:assert/strict';
import { playPage } from '../dist/js/pages.js';
import { authService } from '../dist/js/auth-service.js';
import { playProgress } from '../dist/js/data.js';

test('Play steps unlock in order and preview completion does not transfer between accounts', async () => {
  const originalFetch = globalThis.fetch;
  const previousAccount = authService.state.account;
  globalThis.fetch = async () => Response.json({ realm: { clientVersion: '3.3.5a' } });
  const card = (html, number) => html.match(new RegExp(`<article[^>]*data-play-step="${number}"[^>]*>[\\s\\S]*?</article>`))[0];
  try {
    authService.state.account = null;
    let html = await playPage();
    assert.ok(card(html, 2).includes('is-locked'));
    assert.ok(card(html, 2).includes('data-client-download disabled'));
    assert.ok(card(html, 3).includes('inert aria-hidden="true"'));
    authService.state.account = { id: 'play-test-one' };
    html = await playPage();
    assert.ok(!card(html, 2).includes('is-locked'));
    assert.ok(card(html, 3).includes('is-locked'));
    playProgress.completeDownloadPreview('play-test-one');
    html = await playPage();
    assert.ok(!card(html, 3).includes('is-locked'));
    authService.state.account = { id: 'play-test-two' };
    assert.ok(card(await playPage(), 3).includes('is-locked'));
    authService.state.account = null;
    assert.ok(card(await playPage(), 2).includes('is-locked'));
  } finally {
    globalThis.fetch = originalFetch;
    authService.state.account = previousAccount;
  }
});
