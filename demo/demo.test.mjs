import test from 'node:test';
import assert from 'node:assert/strict';
import { demoRequest } from '../demo-dist/js/demo-adapter.js';

test('Browser demo simulates roles and edits without a backend or real credentials', async () => {
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  const initial = await demoRequest('realm');
  const player = await demoRequest('auth/login', 'POST', { role: 'user' });
  assert.equal(player.authentication.mode, 'demo');
  await assert.rejects(demoRequest('admin/news'), /simulated administrator/);
  await demoRequest('auth/login', 'POST', { role: 'admin' });
  const category = (await demoRequest('admin/categories', 'POST', { name: 'Demo updates' })).category;
  const input = { title: 'Demo article', content: 'Demonstration only', status: 'draft', categoryId: category.id };
  let article = (await demoRequest('admin/news', 'POST', input)).article;
  await assert.rejects(demoRequest(`news/${article.id}`), /not found/);
  article = (await demoRequest(`admin/news/${article.id}`, 'PUT', { ...input, status: 'published', version: article.version })).article;
  assert.equal((await demoRequest(`news/${article.id}`)).article.status, 'published');
  await demoRequest(`admin/categories/${category.id}`, 'DELETE');
  assert.equal((await demoRequest(`news/${article.id}`)).article.categoryName, 'Uncategorized');
  await demoRequest('admin/realm', 'PUT', { ...initial.realm, name: 'Browser only' });
  assert.equal((await demoRequest('realm')).realm.name, 'Browser only');
  await demoRequest(`admin/news/${article.id}`, 'DELETE', { version: article.version });
  await assert.rejects(demoRequest(`news/${article.id}`), /not found/);
  storage.clear();
  assert.equal((await demoRequest('realm')).realm.name, initial.realm.name);
  assert.equal((await demoRequest('auth/session')).account, null);
  delete globalThis.localStorage;
});
