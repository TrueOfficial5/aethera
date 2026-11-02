import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/database.mjs';
import { DevelopmentAuthProvider } from '../server/auth.mjs';
import { createApplication } from '../server/application.mjs';
import { newsCard } from '../dist/js/components.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('Articles and categories remain available after reopening the database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aethera-news-'));
  let store;
  try {
    const path = join(directory, 'test.sqlite');
    store = openDatabase(path, { seed: false });
    const category = store.createCategory('Persistent category');
    const article = store.createArticle({ title: 'Persistent article', content: 'Saved content', categoryId: category.id, status: 'published', imageUrl: null, imageAlt: '' }, null);
    store.updateRealm({ ...store.realm(), name: 'Persistent realm' }, store.realm().version);
    store.close();
    store = openDatabase(path, { seed: false });
    assert.equal(store.article(article.id).content, 'Saved content');
    assert.equal(store.categories()[0].name, 'Persistent category');
    assert.equal(store.realm().name, 'Persistent realm');
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('News lifecycle, visibility, categories, validation and edit conflicts', async () => {
  const store = openDatabase(':memory:', { seed: false });
  try {
    const app = createApplication({ store, provider: new DevelopmentAuthProvider(store) });
    let cookie;
    const call = (path, method = 'GET', body) => app.handle(new Request(`http://127.0.0.1:4173/api/${path}`, { method, headers: { origin: 'http://127.0.0.1:4173', ...(cookie ? { cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
    const login = await call('auth/register', 'POST', { username: 'editor', password: 'Long-editor-password' });
    const account = (await login.json()).account;
    cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('admin/news')).status, 403);
    store.setRole(account.id, 'admin');
    const category = (await (await call('admin/categories', 'POST', { name: 'Updates' })).json()).category;
    assert.equal((await call('admin/categories', 'POST', { name: 'updates' })).status, 409);
    const input = { title: '<script>News</script>', content: '<img src=x onerror=alert(1)>', imageUrl: '', imageAlt: '', categoryId: category.id, status: 'draft' };
    let article = (await (await call('admin/news', 'POST', input)).json()).article;
    assert.equal((await call(`news/${article.id}`)).status, 404);
    assert.equal((await (await call('news')).json()).total, 0);
    const publish = await call(`admin/news/${article.id}`, 'PUT', { ...input, status: 'published', version: article.version });
    article = (await publish.json()).article;
    assert.equal((await call(`news/${article.id}`)).status, 200);
    assert.equal((await (await call(`news?category=${category.id}&limit=1`)).json()).total, 1);
    assert.match(newsCard(article), /&lt;script&gt;/);
    assert.doesNotMatch(newsCard(article), /<img src=x/);
    assert.equal((await call(`admin/news/${article.id}`, 'PUT', { ...input, version: 1 })).status, 409);
    assert.equal((await call(`admin/news/${article.id}`, 'PUT', { ...input, imageUrl: 'javascript:alert(1)', version: article.version })).status, 400);
    await call(`admin/categories/${category.id}`, 'PUT', { name: 'Realm updates' });
    assert.equal((await (await call(`news/${article.id}`)).json()).article.categoryName, 'Realm updates');
    await call(`admin/categories/${category.id}`, 'DELETE');
    assert.equal((await (await call(`news/${article.id}`)).json()).article.categoryName, 'Uncategorized');
    article = (await (await call(`admin/news/${article.id}`, 'PUT', { ...input, categoryId: null, status: 'hidden', version: article.version })).json()).article;
    assert.equal((await call(`news/${article.id}`)).status, 404);
    assert.equal((await call(`admin/news/${article.id}`, 'DELETE', { version: article.version })).status, 200);
    assert.equal((await call(`admin/news/${article.id}`)).status, 404);
  } finally { store.close(); }
});
