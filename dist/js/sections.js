let cleanup;

export function setupSections(root) {
  cleanup?.();
  const home = root.querySelector('.home-page');
  if (!home) return;
  const sections = [...home.querySelectorAll('.hero, .home-section')];
  const cue = home.querySelector('[data-section-next]');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let moving = false;
  let gestureLocked = false;
  let idleTimer;
  let frame;
  let active = 0;
  const offset = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 120;
  const topOf = index => Math.min(document.documentElement.scrollHeight - innerHeight, Math.max(0, sections[index].getBoundingClientRect().top + scrollY - offset()));
  function update() {
    const probe = scrollY + offset() + innerHeight * 0.2;
    active = Math.max(0, sections.findLastIndex(section => section.getBoundingClientRect().top + scrollY <= probe));
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) active = sections.length - 1;
    const smallScreen = matchMedia('(max-width: 800px), (max-height: 500px)').matches;
    const sectionBottom = sections[active].getBoundingClientRect().bottom;
    cue.hidden = moving || active === sections.length - 1 || (smallScreen && sectionBottom > innerHeight - 80) || document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true';
    if (!cue.hidden) {
      const heading = sections[active + 1].querySelector('h2, h1');
      cue.setAttribute('aria-label', `Next section: ${heading?.textContent || 'Continue'}`);
    }
  }
  function unlockAfterIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (moving) unlockAfterIdle();
      else gestureLocked = false;
    }, 220);
  }
  function goTo(index) {
    if (moving || index < 0 || index >= sections.length) return;
    const target = topOf(index);
    moving = true;
    cue.hidden = true;
    const started = performance.now();
    window.scrollTo({ top: target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    function settle() {
      if (Math.abs(scrollY - target) < 2 || performance.now() - started > 1400) {
        moving = false;
        update();
        return;
      }
      frame = requestAnimationFrame(settle);
    }
    frame = requestAnimationFrame(settle);
  }
  function wheel(event) {
    if (matchMedia('(pointer: coarse)').matches) return;
    if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.target.closest('input, textarea, select, [contenteditable], .table-scroll, #navigation')) return;
    if (moving || gestureLocked) {
      event.preventDefault();
      unlockAfterIdle();
      return;
    }
    if (Math.abs(event.deltaY) < 4) return;
    update();
    const direction = event.deltaY > 0 ? 1 : -1;
    const current = sections[active].getBoundingClientRect();
    const available = innerHeight;
    if (current.height > available + 80) {
      if (direction > 0 && current.bottom > innerHeight + 8) return;
      if (direction < 0 && current.top < offset() - 8) return;
    }
    const next = active + direction;
    if (next < 0 || next >= sections.length) return;
    event.preventDefault();
    gestureLocked = true;
    unlockAfterIdle();
    goTo(next);
  }
  window.addEventListener('wheel', wheel, { ...options, passive: false });
  window.addEventListener('scroll', update, { ...options, passive: true });
  window.addEventListener('resize', update, options);
  document.addEventListener('navigationchange', update, options);
  cue.addEventListener('click', () => goTo(active + 1), options);
  home.querySelector('[data-section-top]')?.addEventListener('click', () => goTo(0), options);
  cleanup = () => {
    controller.abort();
    clearTimeout(idleTimer);
    cancelAnimationFrame(frame);
  };
  update();
}
