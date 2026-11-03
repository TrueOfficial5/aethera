import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedNews } from '../server/seed.mjs';
import { config } from '../dist/js/config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'demo-dist');
await mkdir(output, { recursive: true });
await cp(resolve(root, 'dist'), output, { recursive: true });
await cp(resolve(root, 'demo/adapter.js'), resolve(output, 'js/demo-adapter.js'));
await cp(resolve(root, 'server/validation.mjs'), resolve(output, 'js/demo-validation.js'));
const categories = [...new Set(seedNews.map(article => article.category))].map((name, index) => ({ id: `category-${index}`, name }));
const fixture = {
  createdAt: '2026-11-01T12:00:00Z', categories,
  realm: { name: config.realm, expansion: config.expansion, clientVersion: config.version, experience: `${config.rates} proposed rates`, maxLevel: config.level, status: 'In development', version: 1 },
  articles: seedNews.map(article => ({ id: article.id, title: article.title, content: article.body, imageUrl: article.image, imageAlt: article.imageAlt, categoryId: categories.find(category => category.name === article.category).id, categoryName: article.category, author: { id: null, name: 'Aethera team' }, createdAt: `${article.date}T12:00:00Z`, updatedAt: `${article.date}T12:00:00Z`, publishedAt: `${article.date}T12:00:00Z`, scheduledAt: null, status: 'published', version: 1, isDemo: true })),
};
await writeFile(resolve(output, 'js/demo-fixture.js'), `export const fixture = ${JSON.stringify(fixture)};\n`);
const news = await readFile(resolve(output, 'js/news-service.js'), 'utf8');
await writeFile(resolve(output, 'js/news-service.js'), `import { demoRequest as api } from './demo-adapter.js';\nexport { api };\n${news.slice(news.indexOf('export const newsService'))}`);
await writeFile(resolve(output, 'js/auth-service.js'), `import { demoRequest } from './demo-adapter.js';
let state = { account: null, authentication: {} };
export const authService = {
  get state() { return state; },
  async refresh() { state = await demoRequest('auth/session'); return state; },
  async signIn(values) { state = await demoRequest('auth/login', 'POST', values); return state; },
  async signOut() { await demoRequest('auth/logout', 'POST'); return this.refresh(); },
};
`);
let pages = await readFile(resolve(output, 'js/pages.js'), 'utf8');
const start = pages.indexOf('export function accountPage('), end = pages.indexOf('export function rulesPage', start);
pages = pages.slice(0, start) + `export function accountPage() {
  if (authService.state.account) return profilePage();
  return pageHeader('INTERACTIVE DEMO', 'Try the account experience.', 'Simulated accounts only. No passwords, real accounts, or game connection.') + '<section class="container page-section"><div class="panel"><p>Choose a demo role. Changes are saved only in this browser and can be reset at any time.</p><div class="management-actions"><button class="button button--primary" data-demo-account="user">Try player profile</button><button class="button button--outline" data-demo-account="admin">Try admin tools</button></div></div></section>';
}
` + pages.slice(end);
await writeFile(resolve(output, 'js/pages.js'), pages);
let management = await readFile(resolve(output, 'js/management.js'), 'utf8');
management = management.replaceAll('Local test account', 'Simulated demo account').replace('Publishes automatically while the server is running.', 'Demo: publication is simulated when this browser checks the data.');
await writeFile(resolve(output, 'js/management.js'), management);
let app = await readFile(resolve(output, 'js/app.js'), 'utf8');
app = `import { resetDemo } from './demo-adapter.js';\n` + app;
app = app.replace("app.addEventListener('click', async event => {", "app.addEventListener('click', async event => {\n  const demo = event.target.closest('[data-demo-account]');\n  if (demo) { await authService.signIn({ role: demo.dataset.demoAccount }); await completeAccountFlow(); return; }\n");
app += `\ndocument.querySelector('[data-demo-reset]').addEventListener('click', resetDemo);\n`;
await writeFile(resolve(output, 'js/app.js'), app);
const index = await readFile(resolve(output, 'index.html'), 'utf8');
await writeFile(resolve(output, 'index.html'), index.replace('<body>', '<body><aside class="demo-banner" aria-label="Demonstration mode"><span>DEMO · Changes stay in this browser</span><button type="button" data-demo-reset>Reset demo</button></aside>'));
await writeFile(resolve(output, 'css/demo.css'), `:root { --header-offset: 44px; }
body { padding-top: 44px; }
html { scroll-padding-top: calc(var(--header-height) + var(--logo-overhang) + 68px); }
.demo-banner { position: fixed; inset: 0 0 auto; z-index: 50; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: var(--space-3); padding-inline: var(--space-3); background: #202a30; color: var(--text); font-size: .7rem; }
.demo-banner button { min-height: 44px; border: 0; background: none; color: var(--accent); cursor: pointer; font: inherit; text-decoration: underline; }
`);
const html = await readFile(resolve(output, 'index.html'), 'utf8');
await writeFile(resolve(output, 'index.html'), html.replace('</head>', '<link rel="stylesheet" href="./css/demo.css">\n</head>'));
console.log('Static browser demo built in demo-dist. Full local application is unchanged.');
