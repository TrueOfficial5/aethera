let cleanup;

export function setupSections(root) {
  cleanup?.();
  const home = root.querySelector('.home-page');
  if (!home) return;
  const sections = [...home.querySelectorAll('.hero, .home-section')];
  const cue = home.querySelector('[data-section-next]');
  const topCue = home.querySelector('[data-section-top]');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let active = 0;
  let previousScroll = scrollY;
  let topCueDismissed = false;
  const offset = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 120;
  function update() {
    const probe = scrollY + offset() + innerHeight * .2;
    active = Math.max(0, sections.findLastIndex(section => section.getBoundingClientRect().top + scrollY <= probe));
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) active = sections.length - 1;
    if (active !== sections.length - 1) topCueDismissed = false;
    else if (scrollY < previousScroll) topCueDismissed = true;
    else if (scrollY > previousScroll) topCueDismissed = false;
    previousScroll = scrollY;
    if (topCue) {
      const hidden = active !== sections.length - 1 || topCueDismissed;
      topCue.classList.toggle('is-scroll-hidden', hidden);
      topCue.disabled = hidden;
    }
    const smallScreen = matchMedia('(max-width: 800px), (max-height: 500px)').matches;
    cue.hidden = scrollY > 0 || active !== 0 || (smallScreen && sections[0].getBoundingClientRect().bottom > innerHeight - 80) || document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true';
    if (!cue.hidden) cue.setAttribute('aria-label', 'Next section: ' + (sections[active + 1].querySelector('h2, h1')?.textContent || 'Continue'));
  }
  function goTo(index) {
    if (index < 0 || index >= sections.length) return;
    const top = Math.min(document.documentElement.scrollHeight - innerHeight, Math.max(0, sections[index].getBoundingClientRect().top + scrollY - offset()));
    window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  window.addEventListener('scroll', update, { ...options, passive: true });
  window.addEventListener('resize', update, options);
  document.addEventListener('navigationchange', update, options);
  cue.addEventListener('click', () => { update(); goTo(active + 1); }, options);
  topCue?.addEventListener('click', () => goTo(0), options);
  cleanup = () => controller.abort();
  update();
}
