import { config } from './config.js';
import { header, footer, table } from './components.js';
import { dataService } from './data.js';
import { home, newsPage, articlePage, serverPage, playPage, rankingsPage, accountPage, rulesPage, notFound } from './pages.js';
const app = document.querySelector('#app');
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('#main').focus();
});
let rankingCategory = 'players';
let routeVersion = 0;
async function render(scroll = true) {
  const version = ++routeVersion;
  const [page = '', id] = location.hash.replace(/^#\/?/, '').split('/');
  const routes = { '': home, news: () => id ? articlePage(id) : newsPage(), server: serverPage, play: playPage, rankings: () => rankingsPage(rankingCategory), account: accountPage, rules: rulesPage };
  const content = await (routes[page] || notFound)();
  if (version !== routeVersion) return;
  app.innerHTML = `${header(page)}<main id="main" tabindex="-1">${content}</main>${footer()}`;
  document.title = `${page ? page.charAt(0).toUpperCase() + page.slice(1) : 'The Frozen Throne awaits'} — ${config.name}`;
  if (scroll) { window.scrollTo(0, 0); document.querySelector('#main').focus({ preventScroll: true }); }
}
app.addEventListener('click', async event => {
  const menu = event.target.closest('.menu-toggle');
  if (menu) { const expanded = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(expanded)); menu.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation'); document.querySelector('#navigation').classList.toggle('is-open', expanded); }
  const scrollLink = event.target.closest('[data-scroll]');
  if (scrollLink) { event.preventDefault(); document.getElementById(scrollLink.dataset.scroll)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
  const category = event.target.closest('[data-category]');
  if (category) { document.querySelector('#main').innerHTML = await newsPage(category.dataset.category); document.querySelector(`[data-category="${category.dataset.category}"]`).focus(); }
  const ranking = event.target.closest('[data-ranking]');
  if (ranking) { rankingCategory = ranking.dataset.ranking; document.querySelector('#main').innerHTML = await rankingsPage(rankingCategory); document.querySelector(`[data-ranking="${rankingCategory}"]`).focus(); }
  const account = event.target.closest('[data-account]');
  if (account) { document.querySelector('#main').innerHTML = accountPage(account.dataset.account); document.querySelector(`[data-account="${account.dataset.account}"]`).focus(); }
});
app.addEventListener('input', async event => {
  if (event.target.id !== 'ranking-search') return;
  const rows = await dataService.getRankings(rankingCategory);
  const query = event.target.value.toLowerCase();
  document.querySelector('#ranking-results').innerHTML = table(rankingCategory === 'guilds' ? ['Rank', 'Guild', 'Faction', 'Members', 'Score'] : ['Rank', 'Player', 'Class', 'Faction', 'Guild', 'Rating'], rows.filter(row => row.some(value => String(value).toLowerCase().includes(query))));
});
app.addEventListener('submit', event => {
  if (event.target.id !== 'account-form') return;
  event.preventDefault();
  event.target.reset();
  document.querySelector('#form-message').textContent = 'Preview complete. Account services are not connected. No credentials were sent or saved.';
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') { const toggle = document.querySelector('.menu-toggle'); if (toggle?.getAttribute('aria-expanded') === 'true') { toggle.click(); toggle.focus(); } } });
window.addEventListener('hashchange', () => render());
render(false);
