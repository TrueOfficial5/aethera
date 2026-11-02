import { managementPage, managementClick, managementSubmit, profilePage, restoreEditorPosition } from './management.js';
import { authService } from './auth-service.js';
import { config } from './config.js';
import { observeReveals, setupNavigationGlow } from './motion.js';
import { setupSections } from './sections.js';
import { header, footer, table } from './components.js';
import { dataService } from './data.js';
import { home, newsPage, articlePage, serverPage, playPage, rankingsPage, accountPage, rulesPage, notFound } from './pages.js';
const app = document.querySelector('#app');
function updateHeader() {
  document.querySelector('.site-header')?.classList.toggle('is-scrolled', window.scrollY > 24);
}
window.addEventListener('scroll', updateHeader, { passive: true });
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('#main').focus();
});
let rankingCategory = 'players';
let routeVersion = 0;
let pageAnimation;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) pageAnimation?.cancel(); });
async function render(scroll = true) {
  const version = ++routeVersion;
  pageAnimation?.cancel();
  const route = new URL(location.hash.slice(1) || '/', location.origin);
  const [page = '', ...segments] = route.pathname.replace(/^\//, '').split('/');
  const id = segments.join('/');
  const routes = { '': home, news: () => id ? articlePage(id) : newsPage(route.searchParams), admin: () => managementPage(id, route.searchParams), profile: profilePage, server: serverPage, play: playPage, rankings: () => rankingsPage(rankingCategory), account: accountPage, rules: rulesPage };
  let content, pageError;
  try { content = await (routes[page] || notFound)(); } catch (error) { content = '<section class="container page-section"><h1>Unable to load this page</h1><p id="page-error"></p><a class="button button--outline" href="#/account">Your account</a></section>'; pageError = error.message;}
  if (version !== routeVersion) return;
  const motion = getComputedStyle(document.documentElement);
  const previousMain = document.querySelector('#main');
  if (scroll && previousMain && !reducedMotion.matches) {
    pageAnimation = previousMain.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: parseFloat(motion.getPropertyValue('--page-exit-duration')),
      easing: 'ease-out',
      fill: 'forwards',
    });
    await pageAnimation.finished.catch(() => {});
    if (version !== routeVersion) return;
  }
  app.innerHTML = `${header(page)}<main id="main" tabindex="-1">${content}</main>${footer()}`;
  if (pageError) document.querySelector('#page-error').textContent = pageError;
  document.title = `${page ? page.charAt(0).toUpperCase() + page.slice(1) : 'The Frozen Throne awaits'} — ${config.name}`;
  if (scroll) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const main = document.querySelector('#main');
    main.focus({ preventScroll: true });
    if (!reducedMotion.matches) {
      pageAnimation = main.animate([
        { opacity: 0, transform: `translateY(${motion.getPropertyValue('--page-enter-distance').trim()})` },
        { opacity: 1, transform: 'translateY(0)' },
      ], {
        duration: parseFloat(motion.getPropertyValue('--page-enter-duration')),
        easing: motion.getPropertyValue('--page-easing').trim(),
      });
    }
  }
  setupNavigationGlow();
  observeReveals(document.querySelector('#main'));
  updateHeader();
  setupSections(document.querySelector('#main'));
  restoreEditorPosition();
}
app.addEventListener('click', async event => {
  const editorLink = event.target.closest('a[href^="#/admin/edit/"], a[href="#/admin/new"], a[href="#/admin/realm"]');
  if (editorLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
    const destination = new URL(editorLink.href);
    const [path] = destination.hash.split('?');
    if (!/^#\/admin\/(?:edit\/|new(?:\?|$)|realm(?:\?|$))/.test(location.hash)) editorLink.setAttribute('href', `${path}?${new URLSearchParams({ returnTo: location.hash || '#/', returnScroll: String(window.scrollY) })}`);
  }
  if (await managementClick(event, render)) return;
  const retry = event.target.closest('[data-auth-retry]');
  if (retry) {
    retry.disabled = true;
    retry.textContent = 'Connecting…';
    await authService.refresh();
    const form = document.querySelector('#account-form');
    const submit = form?.querySelector('[type="submit"]');
    if (submit) submit.disabled = !authService.state.authentication.available && !authService.state.authentication.retryable;
    document.querySelector('#account-status').textContent = authService.state.authentication.message;
    retry.disabled = false;
    retry.textContent = authService.state.authentication.available ? 'Connection restored' : 'Retry connection';
    return;
  }
  if (event.target.closest('[data-sign-out]')) {
    try { await authService.signOut(); await render(false); } catch (error) { document.querySelector('#form-message').textContent = error.message; }
    return;
  }
  const menu = event.target.closest('.menu-toggle');
  if (menu) { const expanded = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(expanded)); menu.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation'); document.querySelector('#navigation').classList.toggle('is-open', expanded); document.dispatchEvent(new Event('navigationchange')); }
  if (event.target.closest('#navigation a')) {
    const toggle = document.querySelector('.menu-toggle');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    document.querySelector('#navigation').classList.remove('is-open');
    document.dispatchEvent(new Event('navigationchange'));
  }
  const scrollLink = event.target.closest('[data-scroll]');
  if (scrollLink) { event.preventDefault(); document.getElementById(scrollLink.dataset.scroll)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
  const ranking = event.target.closest('[data-ranking]');
  if (ranking) { rankingCategory = ranking.dataset.ranking; document.querySelector('#main').innerHTML = await rankingsPage(rankingCategory); document.querySelector(`[data-ranking="${rankingCategory}"]`).focus(); observeReveals(document.querySelector('#main')); }
  const account = event.target.closest('[data-account]');
  if (account) { document.querySelector('#main').innerHTML = accountPage(account.dataset.account); document.querySelector(`[data-account="${account.dataset.account}"]`).focus(); observeReveals(document.querySelector('#main')); }
});
app.addEventListener('change', event => {
  if (event.target.id !== 'article-status') return;
  const planned = event.target.value === 'planned';
  const field = document.querySelector('#article-schedule');
  field.closest('.schedule-fields').hidden = !planned;
  field.disabled = !planned;
  field.required = planned;
});
app.addEventListener('input', async event => {
  if (event.target.id !== 'ranking-search') return;
  const rows = await dataService.getRankings(rankingCategory);
  const query = event.target.value.toLowerCase();
  document.querySelector('#ranking-results').innerHTML = table(rankingCategory === 'guilds' ? ['Rank', 'Guild', 'Faction', 'Members', 'Score'] : ['Rank', 'Player', 'Class', 'Faction', 'Guild', 'Rating'], rows.filter(row => row.some(value => String(value).toLowerCase().includes(query))));
});
app.addEventListener('submit', async event => {
  if (event.target.matches('#article-editor, #realm-editor, #category-create, .category-row, #news-filters')) { await managementSubmit(event, render); return; }
  if (event.target.id !== 'account-form') return;
  event.preventDefault();
  const form = event.target, submit = form.querySelector('[type="submit"]'), message = form.querySelector('#form-message');
  submit.disabled = true;
  message.textContent = 'Please wait…';
  try {
    await authService.signIn(Object.fromEntries(new FormData(form)), form.dataset.mode === 'register');
    form.reset();
    await render(false);
  } catch (error) { message.textContent = error.message; submit.disabled = false; }
});

document.addEventListener('keydown', event => { if (event.key === 'Escape') { const toggle = document.querySelector('.menu-toggle'); if (toggle?.getAttribute('aria-expanded') === 'true') { toggle.click(); toggle.focus(); } } });
window.addEventListener('hashchange', () => render());
await authService.refresh();
render(false);
