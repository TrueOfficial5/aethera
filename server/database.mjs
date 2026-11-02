import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedNews } from './seed.mjs';
import { HttpError, requireValue } from './validation.mjs';
import { config } from '../dist/js/config.js';

export function openDatabase(path, { seed = true } = {}) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY, provider TEXT NOT NULL, subject TEXT NOT NULL,
      username TEXT NOT NULL, email TEXT, role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      created_at TEXT NOT NULL, UNIQUE(provider, subject)
    );
    CREATE TABLE IF NOT EXISTS local_credentials (
      username TEXT PRIMARY KEY COLLATE NOCASE, account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id),
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, image_url TEXT, image_alt TEXT NOT NULL DEFAULT '',
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      author_id TEXT REFERENCES accounts(id), author_name TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT,
      status TEXT NOT NULL CHECK(status IN ('draft','published','hidden')), is_demo INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS articles_status_date ON articles(status, published_at DESC);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
  `);
  if (!db.prepare('PRAGMA table_info(articles)').all().some(column => column.name === 'scheduled_at')) db.exec('ALTER TABLE articles ADD COLUMN scheduled_at TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS articles_schedule ON articles(scheduled_at)');
  const store = new Store(db);
  store.publishDue();
  if (seed && !db.prepare("SELECT value FROM metadata WHERE key='seeded'").get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const article of seedNews) {
        let category = db.prepare('SELECT id FROM categories WHERE name=?').get(article.category);
        if (!category) category = store.createCategory(article.category);
        store.createArticle({ title: article.title, content: article.body, imageUrl: article.image, imageAlt: article.imageAlt, categoryId: category.id, status: 'published' }, null, { id: article.id, date: `${article.date}T12:00:00.000Z`, demo: true });
      }
      db.prepare("INSERT INTO metadata(key,value) VALUES('seeded','1')").run();
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return store;
}

const articleSelect = `SELECT a.*, c.name AS category_name, u.username AS current_author_name
  FROM articles a LEFT JOIN categories c ON c.id=a.category_id LEFT JOIN accounts u ON u.id=a.author_id`;
const publicAccount = row => row ? { id: row.id, username: row.username, email: row.email, role: row.role, provider: row.provider, createdAt: row.created_at } : null;
const publicArticle = row => row ? {
  id: row.id, title: row.title, content: row.content, imageUrl: row.image_url, imageAlt: row.image_alt,
  categoryId: row.category_id, categoryName: row.category_name || 'Uncategorized',
  author: { id: row.author_id, name: row.current_author_name || row.author_name },
  createdAt: row.created_at, updatedAt: row.updated_at, publishedAt: row.published_at,
  status: row.scheduled_at ? 'planned' : row.status, scheduledAt: row.scheduled_at, isDemo: Boolean(row.is_demo), version: row.version,
} : null;

export class Store {
  constructor(db) { this.db = db; }
  close() { this.db.close(); }
  realm() {
    const saved = this.db.prepare("SELECT value FROM metadata WHERE key='realm-settings'").get();
    return saved ? JSON.parse(saved.value) : { name: config.realm, expansion: config.expansion, clientVersion: config.version, experience: `${config.rates} proposed rates`, maxLevel: config.level, status: 'In development', version: 1 };
  }
  updateRealm(input, version) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      requireValue(this.realm().version === version, 'Realm information changed in another session. Reload before saving.', 409);
      const realm = { ...input, version: version + 1 };
      this.db.prepare("INSERT INTO metadata(key,value) VALUES('realm-settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(realm));
      this.db.exec('COMMIT');
      return realm;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  publishDue(now = new Date().toISOString()) {
    return this.db.prepare("UPDATE articles SET status='published',published_at=scheduled_at,scheduled_at=NULL,updated_at=?,version=version+1 WHERE scheduled_at IS NOT NULL AND scheduled_at<=? AND status='draft'").run(now, now).changes;
  }
  account(id) { return publicAccount(this.db.prepare('SELECT * FROM accounts WHERE id=?').get(id)); }
  identityAccount(provider, identity) {
    let row = this.db.prepare('SELECT * FROM accounts WHERE provider=? AND subject=?').get(provider, identity.subject);
    if (!row) {
      const id = randomUUID();
      this.db.prepare('INSERT INTO accounts(id,provider,subject,username,email,created_at) VALUES(?,?,?,?,?,?)').run(id, provider, identity.subject, identity.username, identity.email || null, new Date().toISOString());
      row = this.db.prepare('SELECT * FROM accounts WHERE id=?').get(id);
    }
    return publicAccount(row);
  }
  setRole(id, role) {
    requireValue(['user', 'admin'].includes(role), 'Invalid role.');
    requireValue(this.db.prepare('UPDATE accounts SET role=? WHERE id=?').run(role, id).changes === 1, 'Account not found.', 404);
  }
  categories() {
    return this.db.prepare('SELECT id,name,created_at AS createdAt,updated_at AS updatedAt FROM categories ORDER BY name COLLATE NOCASE').all();
  }
  createCategory(name) {
    const id = randomUUID(), now = new Date().toISOString();
    try { this.db.prepare('INSERT INTO categories VALUES(?,?,?,?)').run(id, name, now, now); }
    catch (error) { if ((error.code?.includes('SQLITE_CONSTRAINT') || error.errcode === 2067)) throw new HttpError(409, 'That category name already exists.'); throw error; }
    return this.categories().find(category => category.id === id);
  }
  renameCategory(id, name) {
    try { requireValue(this.db.prepare('UPDATE categories SET name=?,updated_at=? WHERE id=?').run(name, new Date().toISOString(), id).changes === 1, 'Category not found.', 404); }
    catch (error) { if ((error.code?.includes('SQLITE_CONSTRAINT') || error.errcode === 2067)) throw new HttpError(409, 'That category name already exists.'); throw error; }
    return this.categories().find(category => category.id === id);
  }
  deleteCategory(id) {
    requireValue(this.db.prepare('DELETE FROM categories WHERE id=?').run(id).changes === 1, 'Category not found.', 404);
  }
  checkCategory(id) { requireValue(id === null || Boolean(this.db.prepare('SELECT id FROM categories WHERE id=?').get(id)), 'Category does not exist.'); }
  listArticles({ page = 1, limit = 6, category = '', status = '', query = '' } = {}, admin = false) {
    this.publishDue();
    const filters = [], args = [];
    if (!admin) { filters.push("a.status='published' AND a.published_at <= ?"); args.push(new Date().toISOString()); }
    else if (status === 'planned') filters.push('a.scheduled_at IS NOT NULL');
    else if (status) { filters.push('a.status=? AND a.scheduled_at IS NULL'); args.push(status); }
    if (category) { filters.push('a.category_id=?'); args.push(category); }
    if (query) { filters.push('instr(lower(a.title),lower(?))>0'); args.push(query); }
    const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
    const total = this.db.prepare(`SELECT count(*) AS total FROM articles a${where}`).get(...args).total;
    const rows = this.db.prepare(`${articleSelect}${where} ORDER BY coalesce(a.published_at,a.created_at) DESC,a.id LIMIT ? OFFSET ?`).all(...args, limit, (page - 1) * limit);
    return { items: rows.map(publicArticle), page, limit, total, hasMore: page * limit < total };
  }
  article(id, admin = false) {
    this.publishDue();
    const row = this.db.prepare(`${articleSelect} WHERE a.id=?`).get(id);
    if (!row || (!admin && (row.status !== 'published' || row.published_at > new Date().toISOString()))) return null;
    return publicArticle(row);
  }
  createArticle(input, author, { id = randomUUID(), date = new Date().toISOString(), demo = false } = {}) {
    this.checkCategory(input.categoryId);
    this.db.prepare(`INSERT INTO articles(id,title,content,image_url,image_alt,category_id,author_id,author_name,created_at,updated_at,published_at,status,is_demo,scheduled_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, input.title, input.content, input.imageUrl, input.imageAlt, input.categoryId, author?.id || null, author?.username || 'Aethera team', date, date, input.status === 'published' ? date : null, input.status === 'planned' ? 'draft' : input.status, demo ? 1 : 0, input.status === 'planned' ? input.scheduledAt : null);
    return this.article(id, true);
  }
  updateArticle(id, input, version) {
    this.checkCategory(input.categoryId);
    requireValue(Boolean(this.article(id, true)), 'Article not found.', 404);
    const now = new Date().toISOString();
    const result = this.db.prepare(`UPDATE articles SET title=?,content=?,image_url=?,image_alt=?,category_id=?,status=?,scheduled_at=?,updated_at=?,
      published_at=CASE WHEN ?='published' THEN coalesce(published_at,?) ELSE published_at END,version=version+1
      WHERE id=? AND version=?`).run(input.title, input.content, input.imageUrl, input.imageAlt, input.categoryId, input.status === 'planned' ? 'draft' : input.status, input.status === 'planned' ? input.scheduledAt : null, now, input.status, now, id, version);
    requireValue(result.changes === 1, 'This article changed in another session. Reload it before saving.', 409);
    return this.article(id, true);
  }
  deleteArticle(id, version) {
    requireValue(Boolean(this.article(id, true)), 'Article not found.', 404);
    requireValue(this.db.prepare('DELETE FROM articles WHERE id=? AND version=?').run(id, version).changes === 1, 'This article changed. Reload before deleting.', 409);
  }
}
