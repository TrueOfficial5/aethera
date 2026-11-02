import test from 'node:test';
import assert from 'node:assert/strict';

test('Objects assemble from different directions under direct scroll control and reverse when scrolling back', async () => {
  const names = ['window', 'document', 'matchMedia', 'getComputedStyle', 'innerHeight', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const originals = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const preference = new EventTarget(); preference.matches = false;
  let backgroundTop = 0, objectTop = 1100, sequence = 0;
  const frames = new Map(), animations = [];
  const context = { getBoundingClientRect: () => ({ top: backgroundTop, height: 1000 }) };
  const element = type => {
    const item = { parentElement: context, contains: target => target === item, matches: selector => selector.split(', ').includes('.' + type), getBoundingClientRect: () => ({ top: objectTop + (item.animation && !item.animation.cancelled ? Number(item.animation.keyframes[0].translate.split(' ')[1].replace('px','')) * (1 - item.animation.currentTime / 1000) : 0) }), animate: keyframes => {
      const animation = { keyframes, currentTime: 0, cancelled: false, pause() {}, cancel() { this.cancelled = true; } };
      item.animation = animation; animations.push(animation); return animation;
    } }; return item;
  };
  const background = element('background'), heading = element('section-heading');
  heading.parentElement = { children: [heading], matches: () => false };
  const cards = [element('news-card'), element('news-card'), element('news-card')];
  const parent = { children: cards, matches: () => false }; cards.forEach(card => { card.parentElement = parent; });
  const root = new EventTarget(); root.querySelector = () => null; root.querySelectorAll = selector => selector === '.hero-image' ? [background] : [heading, ...cards];
  try {
    globalThis.window = new EventTarget(); globalThis.document = new EventTarget(); document.documentElement = {};
    globalThis.innerHeight = 1000; globalThis.matchMedia = () => preference;
    const tokens = { '--parallax-background': '96px', '--assembly-horizontal': '120px', '--assembly-vertical': '64px', '--assembly-start': '1.02', '--assembly-end': '.6' };
    globalThis.getComputedStyle = () => ({ getPropertyValue: name => tokens[name] });
    globalThis.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
    globalThis.cancelAnimationFrame = id => frames.delete(id);
    const { setupScrollEffects } = await import('../dist/js/motion.js');
    const scroll = top => { objectTop = top; backgroundTop = -500; window.dispatchEvent(new Event('scroll')); const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); };
    setupScrollEffects(root);
    assert.equal(heading.animation.keyframes[0].translate, '-120px 0px');
    assert.equal(cards[0].animation.keyframes[0].translate, '-120px 0px');
    assert.equal(cards[1].animation.keyframes[0].translate, '0px 64px');
    assert.equal(cards[2].animation.keyframes[0].translate, '120px 0px');
    scroll(810);
    for (const object of [heading, ...cards]) assert.ok(Math.abs(object.animation.currentTime - 500) < .01);
    assert.equal(frames.size, 0, 'Objects do not continue moving when scrolling stops');
    assert.equal(background.animation.currentTime, 500);
    scroll(500);
    assert.ok(cards.every(card => card.animation.currentTime === 1000 && !card.animation.cancelled));
    scroll(810);
    assert.ok(cards.every(card => Math.abs(card.animation.currentTime - 500) < .01), 'Cards reverse from their assembled position');
    scroll(1100);
    assert.ok(cards.every(card => card.animation.currentTime === 0), 'Objects return to their original entrance offsets');
    preference.matches = true; preference.dispatchEvent(new Event('change'));
    assert.ok(animations.every(animation => animation.cancelled));
  } finally {
    for (const name of names) { if (originals[name]) Object.defineProperty(globalThis, name, originals[name]); else delete globalThis[name]; }
  }
});
