import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/database.mjs';
import { articleInput } from '../server/validation.mjs';

test('Planned articles publish at the deadline, once, and can be rescheduled or cancelled', context => {
  context.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-01T12:00:00Z') });
  const store = openDatabase(':memory:', { seed: false });
  const values = { title: 'Scheduled update', content: 'A future announcement', imageUrl: '', categoryId: null, status: 'planned', scheduledAt: '2026-11-01T13:00:00+01:00' };
  try {
    assert.throws(() => articleInput(values), /future/);
    assert.throws(() => articleInput({ ...values, scheduledAt: '' }), /date and time/);
    assert.throws(() => articleInput({ ...values, scheduledAt: '2026-11-02T12:00' }), /date and time/);
    const input = articleInput({ ...values, scheduledAt: '2026-11-01T14:00:00+01:00' });
    let article = store.createArticle(input, null);
    assert.equal(article.status, 'planned');
    assert.equal(article.scheduledAt, '2026-11-01T13:00:00.000Z');
    assert.equal(store.article(article.id), null);
    assert.equal(store.listArticles().total, 0);
    assert.equal(store.listArticles({ status: 'planned' }, true).total, 1);
    assert.equal(store.listArticles({ status: 'draft' }, true).total, 0);
    article = store.updateArticle(article.id, { ...input, scheduledAt: '2026-11-01T14:00:00.000Z' }, article.version);
    context.mock.timers.tick(3600000);
    assert.equal(store.publishDue(), 0);
    assert.equal(store.article(article.id, true).status, 'planned');
    context.mock.timers.tick(3600000);
    assert.equal(store.publishDue(), 1);
    const published = store.article(article.id);
    assert.equal(published.status, 'published');
    assert.equal(published.publishedAt, '2026-11-01T14:00:00.000Z');
    assert.equal(published.scheduledAt, null);
    assert.equal(store.publishDue(), 0);
    assert.throws(() => store.updateArticle(article.id, input, article.version), /changed/);
    const cancelInput = articleInput({ ...values, scheduledAt: '2026-11-02T12:00:00Z' });
    let cancelled = store.createArticle(cancelInput, null);
    cancelled = store.updateArticle(cancelled.id, { ...cancelInput, status: 'hidden', scheduledAt: null }, cancelled.version);
    context.mock.timers.tick(86400000);
    store.publishDue();
    assert.equal(store.article(cancelled.id), null);
    assert.equal(store.article(cancelled.id, true).status, 'hidden');
  } finally { store.close(); }
});
