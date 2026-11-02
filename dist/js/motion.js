const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const activeAnimations = new Set();
let cleanupScrollEffects;
let backgroundVideo;
let backgroundObserver;
let backgroundVisible = false;
let navigationObserver;
let cleanupNavigationGlow;
let logoEffectsBlockedUntil = 0;

export function setupNavigationGlow() {
  cleanupNavigationGlow?.();
  navigationObserver?.disconnect();
  const header = document.querySelector('.site-header');
  if (!header) return;
  const updateContour = () => {
    const tokens = getComputedStyle(header);
    const width = header.getBoundingClientRect().width;
    const center = width / 2;
    const logo = parseFloat(tokens.getPropertyValue('--logo-width')) / 2;
    const curve = parseFloat(tokens.getPropertyValue('--logo-curve'));
    const top = parseFloat(tokens.getPropertyValue('--header-height'));
    const bottom = top + parseFloat(tokens.getPropertyValue('--logo-overhang'));
    const glowWidth = width * .24;
    header.querySelectorAll('[data-glow-gradient]').forEach(gradient => {
      const left = gradient.dataset.glowGradient === 'left';
      gradient.setAttribute('x1', String(left ? glowWidth / 2 : -glowWidth / 2));
      gradient.setAttribute('x2', String(left ? -glowWidth / 2 : glowWidth / 2));
      const motion = gradient.querySelector('[data-glow-motion]');
      motion.setAttribute('values', `${center} 0;${left ? -glowWidth / 2 : width + glowWidth / 2} 0`);
      motion.setAttribute('dur', tokens.getPropertyValue('--nav-glow-duration').trim());
      motion.setAttribute('keyTimes', '0;1');
      motion.setAttribute('keySplines', '.4 0 .6 1');
      motion.setAttribute('repeatCount', 'indefinite');
    });
    header.querySelectorAll('[data-glow-side]').forEach(path => {
      const direction = path.dataset.glowSide === 'left' ? -1 : 1;
      const inner = center + direction * (logo - curve);
      const control = center + direction * logo;
      const outer = center + direction * (logo + curve);
      path.setAttribute('d', `M ${center} ${bottom} H ${inner} C ${control} ${bottom}, ${control} ${top}, ${outer} ${top} H ${direction === -1 ? 0 : width}`);
    });
  };
  navigationObserver = new ResizeObserver(updateContour);
  navigationObserver.observe(header);
  updateContour();
  const controller = new AbortController();
  const pulses = new Set();
  let pendingBurst;
  if (Date.now() < logoEffectsBlockedUntil) header.classList.add('is-logo-suppressed');
  let resetPulse;
  const restoreLoop = () => {
    resetPulse = null;
    header.classList.remove('is-glow-burst');
    updateContour();
    header.querySelectorAll('[data-glow-motion]').forEach(motion => motion.beginElement());
  };
  const shine = () => {
    if (reducedMotion.matches || !logo?.matches(':hover, :focus-visible')) return;
    header.classList.add('is-logo-shining');
  };
  const burst = event => {
    if (Date.now() < logoEffectsBlockedUntil) return;
    if (reducedMotion.matches || event.pointerType === 'touch' || resetPulse != null) return;
    const duration = parseFloat(getComputedStyle(header).getPropertyValue('--nav-glow-burst-duration')) || 900;
    const width = header.getBoundingClientRect().width;
    const center = width / 2;
    header.classList.add('is-glow-burst');
    header.querySelectorAll('[data-glow-motion]').forEach(motion => {
      const edge = motion.dataset.glowMotion === 'left' ? 0 : width;
      motion.setAttribute('values', `${center} 0;${edge} 0;${center} 0`);
      motion.setAttribute('keyTimes', '0;.5;1');
      motion.setAttribute('keySplines', '.2 0 .4 1;.4 0 .8 1');
      motion.setAttribute('repeatCount', '1');
      motion.setAttribute('dur', `${duration}ms`);
      motion.beginElement();
    });
    header.querySelectorAll('[data-glow-side]').forEach(path => {
      const animation = path.animate([
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: .12 },
        { opacity: 1, offset: .85 },
        { opacity: 0, offset: 1 },
      ], { duration, easing: 'ease-out' });
      pulses.add(animation);
      animation.finished.catch(() => {}).finally(() => pulses.delete(animation));
    });
    resetPulse = setTimeout(() => { shine(); restoreLoop(); }, duration);
  };
  const logo = header.querySelector('.header-brand .brand');
  const requestBurst = event => {
    clearTimeout(pendingBurst);
    const remaining = logoEffectsBlockedUntil - Date.now();
    if (remaining <= 0) { header.classList.remove('is-logo-suppressed'); burst(event); return; }
    pendingBurst = setTimeout(() => {
      header.classList.remove('is-logo-suppressed');
      if (logo?.matches(':hover, :focus-visible')) burst(event);
    }, remaining);
  };
  logo?.addEventListener('pointerenter', requestBurst, { signal: controller.signal });
  logo?.addEventListener('focus', requestBurst, { signal: controller.signal });
  const hideShine = () => {
    if (!logo?.matches(':hover, :focus-visible')) {
      clearTimeout(pendingBurst);
      header.classList.remove('is-logo-shining');
    }
  };
  logo?.addEventListener('pointerleave', hideShine, { signal: controller.signal });
  logo?.addEventListener('blur', hideShine, { signal: controller.signal });
  const stopPulse = () => {
    clearTimeout(pendingBurst);
    header.classList.remove('is-logo-shining');
    clearTimeout(resetPulse);
    pulses.forEach(animation => animation.cancel());
    pulses.clear();
    if (resetPulse != null) restoreLoop();
  };
  logo?.addEventListener('click', () => {
    logoEffectsBlockedUntil = Date.now() + 1400;
    header.classList.add('is-logo-suppressed');
    stopPulse();
  }, { signal: controller.signal });
  reducedMotion.addEventListener('change', stopPulse, { signal: controller.signal });
  cleanupNavigationGlow = () => { controller.abort(); stopPulse(); };
}

function updateBackgroundVideo() {
  const video = backgroundVideo;
  if (!video) return;
  if (reducedMotion.matches || document.hidden || !backgroundVisible) {
    video.pause();
    if (reducedMotion.matches) video.classList.remove('is-playing');
    return;
  }
  video.muted = true;
  if (!video.getAttribute('src')) video.src = video.dataset.src;
  video.play().catch(() => video.classList.remove('is-playing'));
}

document.addEventListener('visibilitychange', updateBackgroundVideo);
reducedMotion.addEventListener('change', updateBackgroundVideo);

export function setupBackgroundVideo(root) {
  backgroundObserver?.disconnect();
  backgroundVideo?.pause();
  backgroundVideo = root.querySelector('.background-video');
  backgroundVisible = false;
  if (!backgroundVideo) return;
  backgroundVideo.addEventListener('playing', event => event.currentTarget.classList.add('is-playing'));
  backgroundVideo.addEventListener('error', event => event.currentTarget.classList.remove('is-playing'));
  backgroundObserver = new IntersectionObserver(entries => {
    backgroundVisible = entries[0].isIntersecting;
    updateBackgroundVideo();
  });
  backgroundObserver.observe(backgroundVideo);
}

function stopScrollEffects() {
  cleanupScrollEffects?.();
  cleanupScrollEffects = null;
  activeAnimations.forEach(animation => animation.cancel());
  activeAnimations.clear();
}

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) stopScrollEffects();
});

export function setupScrollEffects(root) {
  setupBackgroundVideo(root);
  stopScrollEffects();
  if (reducedMotion.matches) return;
  const tokens = getComputedStyle(document.documentElement);
  const backgroundDistance = parseFloat(tokens.getPropertyValue('--parallax-background')) || 96;
  const horizontal = parseFloat(tokens.getPropertyValue('--assembly-horizontal')) || 120;
  const vertical = parseFloat(tokens.getPropertyValue('--assembly-vertical')) || 64;
  const start = parseFloat(tokens.getPropertyValue('--assembly-start')) || 1.02;
  const end = parseFloat(tokens.getPropertyValue('--assembly-end')) || .6;
  const controller = new AbortController();
  const backgrounds = [];
  const objects = new Map();
  const hero = root.querySelector('.hero');
  const heroTitle = hero?.querySelector('h1');
  const heroObjects = hero ? [...hero.querySelectorAll('.hero-content > *, .hero-bottom, .realm-strip')] : [];
  const heroAnimations = new Map();
  const heroDuration = parseFloat(tokens.getPropertyValue('--hero-enter-duration')) || 380;
  const heroStagger = parseFloat(tokens.getPropertyValue('--hero-enter-stagger')) || 35;
  const heroDistance = parseFloat(tokens.getPropertyValue('--hero-enter-distance')) || 32;
  const heroTitleBottom = heroTitle ? heroTitle.getBoundingClientRect().bottom - hero.getBoundingClientRect().top : 0;
  let heroStarted = false;
  let heroScrollControlled = false;
  let frame;
  function revealHero() {
    heroAnimations.forEach(animation => { animation.cancel(); activeAnimations.delete(animation); });
    heroAnimations.clear();
    heroObjects.forEach((element, index) => {
      const animation = element.animate([
        { opacity: 0, translate: `0 -${heroDistance}px` },
        { opacity: 1, translate: '0 0' },
      ], { duration: heroDuration, delay: Math.min(index, 4) * heroStagger, easing: tokens.getPropertyValue('--page-easing').trim() || 'ease-out', fill: 'backwards' });
      activeAnimations.add(animation);
      heroAnimations.set(element, animation);
      animation.finished.catch(() => {}).finally(() => {
        activeAnimations.delete(animation);
        if (heroAnimations.get(element) === animation) heroAnimations.delete(element);
      });
    });
  }
  function updateHero() {
    if (!heroTitle) return;
    const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const top = hero.getBoundingClientRect().top;
    const range = Math.max(heroDistance, heroTitleBottom - header);
    if (!heroStarted && top >= -heroDistance) {
      heroStarted = true;
      revealHero();
    }
    if (!heroScrollControlled && top < -range) {
      heroStarted = true;
      heroScrollControlled = true;
      heroAnimations.forEach(animation => { animation.cancel(); activeAnimations.delete(animation); });
      heroAnimations.clear();
      heroObjects.forEach(element => heroAnimations.set(element, animationFor(element, [
        { opacity: 0, translate: `0 -${heroDistance}px` },
        { opacity: 1, translate: '0 0' },
      ])));
    }
    if (heroScrollControlled) {
      const progress = Math.max(0, Math.min(1, 1 + top / range));
      heroAnimations.forEach(animation => { animation.currentTime = progress * 1000; });
    }
  }
  function animationFor(element, keyframes) {
    const animation = element.animate(keyframes, { duration: 1000, easing: 'linear', fill: 'both' });
    animation.pause(); animation.currentTime = 0;
    activeAnimations.add(animation);
    return animation;
  }
  function finish(element, item) {
    item.animation.cancel(); activeAnimations.delete(item.animation); objects.delete(element);
  }
  root.querySelectorAll('.hero-image').forEach(element => {
    backgrounds.push({ context: element.parentElement, animation: animationFor(element, [{ translate: '0 0' }, { translate: '0 ' + backgroundDistance + 'px' }]) });
  });
  root.querySelectorAll('.section-heading, .news-card, .feature-card, .journey-panel, .server-grid > *, .step, .rule, .profile-grid > .panel, .management-stack > .panel, .management > .panel').forEach(element => {
    const index = [...element.parentElement.children].indexOf(element);
    let x = 0, y = 0;
    if (element.parentElement.matches('[data-motion="vertical"]')) y = vertical;
    else if (element.matches('.section-heading')) x = -horizontal;
    else if (element.matches('.journey-panel, .step, .rule')) y = vertical;
    else if (element.parentElement.matches('.server-grid, .profile-grid')) x = index % 2 ? horizontal : -horizontal;
    else if (index % 3 === 0) x = -horizontal;
    else if (index % 3 === 1) y = vertical;
    else x = horizontal;
    const animation = animationFor(element, [{ opacity: .15, translate: x + 'px ' + y + 'px' }, { opacity: 1, translate: '0 0' }]);
    objects.set(element, { animation, y, offset: y });
  });
  function update() {
    frame = null;
    updateHero();
    const contexts = new Map();
    backgrounds.forEach(layer => { if (!contexts.has(layer.context)) contexts.set(layer.context, layer.context.getBoundingClientRect()); });
    const measurements = [...objects].map(([element, item]) => ({ element, item, top: element.getBoundingClientRect().top - item.offset }));
    backgrounds.forEach(layer => {
      const bounds = contexts.get(layer.context);
      layer.animation.currentTime = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height))) * 1000;
    });
    measurements.forEach(({ element, item, top }) => {
      const progress = Math.max(0, Math.min(1, (innerHeight * start - top) / Math.max(1, innerHeight * (start - end))));
      const eased = progress * progress * (3 - 2 * progress);
      item.animation.currentTime = eased * 1000;
      item.offset = item.y * (1 - eased);
    });
  }
  function schedule() { if (frame == null && (backgrounds.length || objects.size || heroObjects.length)) frame = requestAnimationFrame(update); }
  window.addEventListener('scroll', schedule, { passive: true, signal: controller.signal });
  window.addEventListener('resize', schedule, { signal: controller.signal });
  root.addEventListener('focusin', event => {
    for (const [element, item] of objects) if (element.contains(event.target)) finish(element, item);
    for (const [element, animation] of heroAnimations) if (element.contains(event.target)) {
      animation.cancel(); activeAnimations.delete(animation); heroAnimations.delete(element);
    }
  }, { signal: controller.signal });
  cleanupScrollEffects = () => { controller.abort(); cancelAnimationFrame(frame); objects.clear(); heroAnimations.clear(); };
  update();
}
