const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const activeAnimations = new Set();
let revealObserver;
let backgroundVideo;
let backgroundObserver;
let backgroundVisible = false;
let navigationObserver;

export function setupNavigationGlow() {
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

function stopReveals() {
  revealObserver?.disconnect();
  activeAnimations.forEach(animation => animation.cancel());
  activeAnimations.clear();
}

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) stopReveals();
});

export function observeReveals(root) {
  setupBackgroundVideo(root);
  stopReveals();
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const tokens = getComputedStyle(document.documentElement);
  const duration = parseFloat(tokens.getPropertyValue('--reveal-duration'));
  const stagger = parseFloat(tokens.getPropertyValue('--reveal-stagger'));
  const distance = tokens.getPropertyValue('--reveal-distance').trim();
  const easing = tokens.getPropertyValue('--page-easing').trim();
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      revealObserver.unobserve(element);
      const grouped = element.parentElement.matches('.news-grid, .feature-grid, .hero-content, .page-heading > .container');
      const index = grouped ? Math.min([...element.parentElement.children].indexOf(element), 4) : 0;
      const animation = element.animate([
        { opacity: 0, translate: `0 ${distance}` },
        { opacity: 1, translate: '0 0' },
      ], { duration, delay: index * stagger, easing, fill: 'backwards' });
      activeAnimations.add(animation);
      animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
  root.querySelectorAll('.hero-content > *, .page-heading > .container > *, .section-heading, .news-card, .feature-card, .journey-panel, .step, .rule, .server-grid > *, .account-panel, .account-copy').forEach(element => {
    revealObserver.observe(element);
  });
}
