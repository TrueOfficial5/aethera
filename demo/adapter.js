import { articleInput, realmInput, pageOptions, text } from './demo-validation.js';
import { fixture } from './demo-fixture.js';

const key = 'aethera-browser-demo-v1';
const authentication = { available: true, mode: 'demo', message: 'Simulated demo accounts. No real authentication or game connection.' };
const fresh = () => structuredClone({ ...fixture, account: null });
function load() {
  let state;
  try { state = JSON.parse(localStorage.getItem(key)) || fresh(); } catch { state = fresh(); }
  for (const article of state.articles) {
    if (article.status === 'planned' && Date.parse(article.scheduledAt) <= Date.now()) {
      article.status = 'published';
      article.publishedAt = article.scheduledAt;
      article.scheduledAt = null;
      article.version++;
    }
  }
  return state;
}
const save = state => localStorage.setItem(key, JSON.stringify(state));
const requireDemo = (condition, message) => { if (!condition) throw new Error(message); };
export function resetDemo() { localStorage.removeItem(key); location.hash = '#/'; location.reload(); }
export async function demoRequest(path, method = 'GET', body = {}) {
  const state = load();
  save(state);
  const url = new URL(path, 'https://demo.invalid/');
  const route = url.pathname.slice(1);
  const now = new Date().toISOString();
  const admin = route.startsWith('admin/');
  if (admin) requireDemo(state.account?.role === 'admin', 'Choose the simulated administrator account to use this demo tool.');
  let result;
  if (route === 'auth/session') return { account: state.account, authentication };
  if (route === 'auth/login') {
    const role = body.role === 'admin' ? 'admin' : 'user';
    state.account = { id: `demo-${role}`, username: role === 'admin' ? 'DemoAdmin' : 'DemoAdventurer', email: `${role}@example.invalid`, role, provider: 'browser-demo', createdAt: fixture.createdAt };
    result = { account: state.account, authentication };
  } else if (route === 'auth/logout') { state.account = null; result = { success: true }; }
  else if (route === 'realm') return { realm: state.realm };
  else if (route === 'admin/realm' && method === 'PUT') {
    requireDemo(body.version === state.realm.version, 'Realm information changed. Reload before saving.');
    state.realm = { ...realmInput(body), version: state.realm.version + 1 };
    result = { realm: state.realm };
  } else if (route === 'categories') return { items: state.categories };
  else if (route.startsWith('admin/categories')) {
    const id = route.split('/')[2];
    const category = state.categories.find(item => item.id === id);
    if (method === 'DELETE') {
      requireDemo(category, 'Category not found.');
      state.categories = state.categories.filter(item => item.id !== id);
      state.articles.filter(article => article.categoryId === id).forEach(article => { article.categoryId = null; article.categoryName = 'Uncategorized'; });
      result = { success: true };
    } else {
      const name = text(body.name, 'Category', 1, 50);
      requireDemo(!state.categories.some(item => item.id !== id && item.name.toLowerCase() === name.toLowerCase()), 'That category already exists.');
      if (method === 'POST') { const item = { id: crypto.randomUUID(), name }; state.categories.push(item); result = { category: item }; }
      else {
        requireDemo(category, 'Category not found.'); category.name = name;
        state.articles.filter(article => article.categoryId === id).forEach(article => { article.categoryName = name; });
        result = { category };
      }
    }
  } else if (/^(admin\/)?news(\/|$)/.test(route)) {
    const id = route.split('/')[admin ? 2 : 1];
    const article = state.articles.find(item => item.id === id);
    if (method === 'GET' && !id) {
      const filters = pageOptions(url);
      const items = state.articles.filter(item => (admin || item.status === 'published') && (!filters.status || !admin || item.status === filters.status) && (!filters.category || item.categoryId === filters.category) && item.title.toLowerCase().includes(filters.query.toLowerCase())).sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt));
      return { items: items.slice((filters.page - 1) * filters.limit, filters.page * filters.limit), page: filters.page, limit: filters.limit, total: items.length, hasMore: filters.page * filters.limit < items.length };
    }
    if (method === 'GET') { requireDemo(article && (admin || article.status === 'published'), 'Article not found.'); return { article }; }
    requireDemo(admin, 'Demo administrator required.');
    if (id) { requireDemo(article, 'Article not found.'); requireDemo(body.version === article.version, 'This article changed. Reload before saving.'); }
    if (method === 'DELETE') { state.articles = state.articles.filter(item => item.id !== id); result = { success: true }; }
    else {
      const input = articleInput(body);
      const category = state.categories.find(item => item.id === input.categoryId);
      requireDemo(!input.categoryId || category, 'Category not found.');
      const updated = { ...input, id: id || crypto.randomUUID(), categoryName: category?.name || 'Uncategorized', author: article?.author || { id: state.account.id, name: state.account.username }, createdAt: article?.createdAt || now, updatedAt: now, publishedAt: input.status === 'published' ? article?.publishedAt || now : article?.publishedAt || null, version: (article?.version || 0) + 1, isDemo: true };
      if (article) Object.assign(article, updated); else state.articles.push(updated);
      result = { article: updated };
    }
  } else throw new Error('This action is unavailable in the browser demo.');
  save(state);
  return structuredClone(result);
}
