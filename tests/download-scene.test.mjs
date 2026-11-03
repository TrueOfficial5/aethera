import test from 'node:test';
import assert from 'node:assert/strict';

test('Download scene plays once, restores the page after ending and respects reduced motion', async () => {
  const names = ['document', 'matchMedia'];
  const originals = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const preference = new EventTarget();
  preference.matches = false;
  const classes = () => {
    const values = new Set();
    return { add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value) };
  };
  try {
    globalThis.document = new EventTarget();
    globalThis.matchMedia = () => preference;
    const { playDownloadScene } = await import('../dist/js/motion.js');
    const layer = { classList: classes() };
    const heading = { classList: classes(), scrollIntoView() {} };
    const video = new EventTarget();
    Object.assign(video, {
      dataset: { src: '/videos/running.mp4' }, parentElement: layer, plays: 0, paused: true,
      closest: () => heading, getAttribute: () => video.src,
      animate(keyframes) { this.framing = { keyframes, currentTime: 0, pause() {}, cancel() {} }; return this.framing; },
      pause() { this.paused = true; },
      async play() { this.paused = false; this.plays++; this.dispatchEvent(new Event('playing')); },
    });
    const completionLabel = { hidden: true };
    const card = { dataset: { progressOwner: 'test-player' }, classList: classes(), querySelector: () => completionLabel };
    const status = {}, button = { disabled: false, closest: selector => selector === '.is-locked' ? card.classList.contains('is-locked') ? card : null : card };
    const root = { isConnected: true, querySelector: selector => selector === '.download-video' ? video : selector === '.page-heading' ? heading : status };
    card.classList.add('is-locked');
    await playDownloadScene(root, button);
    assert.equal(video.plays, 0, 'Locked steps cannot start the video');
    card.classList.remove('is-locked');
    await playDownloadScene(root, button);
    assert.equal(video.plays, 1);
    assert.equal(button.disabled, true);
    assert.ok(!heading.classList.contains('is-download-expanded'));
    assert.ok(layer.classList.contains('is-download-active'));
    assert.ok(layer.classList.contains('is-download-playing'));
    video.duration = 7;
    video.currentTime = 3.5;
    video.dispatchEvent(new Event('timeupdate'));
    assert.equal(video.framing.currentTime, 500, 'Framing follows video time rather than a separate clock');
    video.currentTime = 1.75;
    video.dispatchEvent(new Event('seeked'));
    assert.equal(video.framing.currentTime, 250, 'Seeking keeps the character framing synchronized');
    assert.ok(!card.classList.contains('is-complete'), 'The step is incomplete while the video is playing');
    video.dispatchEvent(new Event('ended'));
    assert.ok(card.classList.contains('is-complete'));
    assert.equal(completionLabel.hidden, false);
    assert.ok(!layer.classList.contains('is-download-active'));
    assert.ok(!heading.classList.contains('is-download-expanded'));
    assert.ok(!layer.classList.contains('is-download-playing'));
    assert.equal(video.paused, true);
    assert.equal(button.disabled, false);
    assert.ok(status.textContent.includes('Your journey begins now'));
    preference.matches = true;
    await playDownloadScene(root, button);
    assert.equal(video.plays, 1, 'Reduced motion skips playback without expanding the page');
    assert.ok(!heading.classList.contains('is-download-expanded'));
  } finally {
    for (const name of names) { if (originals[name]) Object.defineProperty(globalThis, name, originals[name]); else delete globalThis[name]; }
  }
});
