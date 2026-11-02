import test from 'node:test';
import assert from 'node:assert/strict';

test('Hero keeps its timed entrance and follows scroll position on return', async () => {
  const names = ['window', 'document', 'matchMedia', 'getComputedStyle', 'innerHeight', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const originals = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const preference = new EventTarget(); preference.matches = false;
  let titleBottom = 350, sequence = 0;
  const frames = new Map(), animations = [];
  const makeElement = lower => ({
    matches: () => lower,
    contains: () => false,
    getBoundingClientRect: () => ({ top: titleBottom - 150, bottom: titleBottom }),
    animate: (keyframes, timing) => {
      const animation = { keyframes, timing, paused: false, cancelled: false, finished: new Promise(() => {}), pause() { this.paused = true; }, cancel() { this.cancelled = true; } };
      animations.push(animation); return animation;
    },
  });
  const title = makeElement(false), copy = makeElement(false), actions = makeElement(false), realm = makeElement(true);
  const hero = { getBoundingClientRect: () => ({ top: titleBottom - 350 }), querySelector: () => title, querySelectorAll: () => [title, copy, actions, realm] };
  const root = new EventTarget();
  root.querySelector = selector => selector === '.hero' ? hero : null;
  root.querySelectorAll = () => [];
  try {
    globalThis.window = new EventTarget(); globalThis.document = new EventTarget(); document.documentElement = {};
    globalThis.innerHeight = 900; globalThis.matchMedia = () => preference;
    globalThis.getComputedStyle = () => ({ scrollPaddingTop: '122px', getPropertyValue: () => '' });
    globalThis.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
    globalThis.cancelAnimationFrame = id => frames.delete(id);
    const { setupScrollEffects } = await import('../dist/js/motion.js');
    const scroll = bottom => { titleBottom = bottom; window.dispatchEvent(new Event('scroll')); const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
    setupScrollEffects(root);
    assert.equal(animations.length, 4, 'All hero content enters without requiring a scroll');
    assert.ok(animations.every(animation => !animation.paused));
    assert.equal(animations[0].keyframes[1].opacity, 1);
    assert.ok(animations.every(animation => animation.keyframes[0].translate === '0 -32px'), 'Every hero object enters from above');
    scroll(300); scroll(290);
    assert.equal(animations.length, 4, 'Small movements do not restart the entrance');
    scroll(40);
    assert.equal(animations.length, 8);
    const returning = animations.slice(4);
    assert.ok(returning.every(animation => animation.paused && animation.currentTime === 0));
    assert.ok(animations.slice(0, 4).every(animation => animation.cancelled));
    scroll(140);
    const firstProgress = returning[0].currentTime;
    assert.ok(firstProgress > 0 && firstProgress < 1000);
    assert.equal(frames.size, 0, 'Movement stops without further scroll events');
    scroll(220);
    assert.ok(returning.every(animation => animation.currentTime > firstProgress));
    scroll(140);
    assert.equal(returning[0].currentTime, firstProgress, 'Reversing scroll reverses the animation');
    scroll(350);
    assert.ok(returning.every(animation => animation.currentTime === 1000));
    assert.equal(animations.length, 8, 'Returning never replays the timed entrance');
    preference.matches = true; preference.dispatchEvent(new Event('change'));
    assert.ok(animations.every(animation => animation.cancelled));
    setupScrollEffects(root);
    assert.equal(animations.length, 8, 'Reduced motion displays the hero without an entrance');
  } finally {
    for (const name of names) { if (originals[name]) Object.defineProperty(globalThis, name, originals[name]); else delete globalThis[name]; }
  }
});
