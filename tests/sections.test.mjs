import test from 'node:test';
import assert from 'node:assert/strict';
import { setupSections } from '../dist/js/sections.js';

test('Mouse wheel and touch stay native while scroll arrows remain available', () => {
  const names = ['window', 'document', 'matchMedia', 'getComputedStyle', 'scrollY', 'innerHeight'];
  const originals = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const cue = new EventTarget(), topCue = new EventTarget();
  const topClasses = new Set();
  topCue.classList = { toggle: (name, enabled) => enabled ? topClasses.add(name) : topClasses.delete(name) };
  cue.setAttribute = () => {};
  const scrolls = [];
  const sections = [0, 900, 1700].map(top => ({ getBoundingClientRect: () => ({ top: top - scrollY, bottom: top + 900 - scrollY }), querySelector: () => ({ textContent: 'Section' }) }));
  const home = { querySelectorAll: () => sections, querySelector: selector => selector === '[data-section-next]' ? cue : topCue };
  try {
    globalThis.scrollY = 0; globalThis.innerHeight = 900;
    globalThis.window = new EventTarget();
    window.scrollTo = value => scrolls.push(value);
    globalThis.document = new EventTarget();
    document.documentElement = { scrollHeight: 3000 };
    document.querySelector = () => null;
    globalThis.getComputedStyle = () => ({ scrollPaddingTop: '128px' });
    globalThis.matchMedia = () => ({ matches: false });
    setupSections({ querySelector: () => home });
    for (const type of ['wheel', 'wheel', 'touchstart', 'keydown']) {
      const event = new Event(type, { cancelable: true });
      window.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
    }
    assert.equal(scrolls.length, 0, 'Scrolling never forces a section jump');
    assert.equal(cue.hidden, false, 'The down arrow is visible in the first section');
    globalThis.scrollY = 1;
    window.dispatchEvent(new Event('scroll'));
    assert.equal(cue.hidden, true, 'The down arrow disappears as soon as scrolling starts');
    globalThis.scrollY = 0;
    window.dispatchEvent(new Event('scroll'));
    assert.equal(cue.hidden, false, 'The down arrow returns at the top');
    cue.dispatchEvent(new Event('click'));
    assert.deepEqual(scrolls[0], { top: 772, behavior: 'smooth' });
    globalThis.scrollY = 900;
    window.dispatchEvent(new Event('scroll'));
    assert.equal(cue.hidden, true, 'Later sections do not show a down arrow');
    globalThis.scrollY = 1700;
    window.dispatchEvent(new Event('scroll'));
    assert.equal(topCue.disabled, false, 'Back to top is visible when arriving at the final section');
    globalThis.scrollY = 1699;
    window.dispatchEvent(new Event('scroll'));
    assert.equal(topClasses.has('is-scroll-hidden'), true, 'Back to top disappears after one pixel of upward scrolling');
    globalThis.scrollY = 1700;
    window.dispatchEvent(new Event('scroll'));
    assert.equal(topCue.disabled, false, 'Returning downward restores Back to top');
    topCue.dispatchEvent(new Event('click'));
    assert.equal(scrolls[1].top, 0);
    globalThis.scrollY = 0;
    const wheel = (delta, extras = {}) => {
      const event = new Event('wheel', { cancelable: true });
      Object.defineProperties(event, Object.fromEntries(Object.entries({ deltaY: delta, deltaX: 0, deltaMode: 0, ...extras }).map(([name, value]) => [name, { value }])));
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    for (const delta of [7, 120, -120, 720]) assert.equal(wheel(delta), false, 'All wheel distances remain native');
    assert.equal(scrolls.length, 2, 'Wheel input does not trigger programmatic scrolling');
    const count = scrolls.length;
    setupSections({ querySelector: () => null });
    cue.dispatchEvent(new Event('click'));
    assert.equal(wheel(120), false);
    assert.equal(scrolls.length, count, 'Old scroll listeners are removed after navigation');
  } finally {
    for (const name of names) { if (originals[name]) Object.defineProperty(globalThis, name, originals[name]); else delete globalThis[name]; }
  }
});
