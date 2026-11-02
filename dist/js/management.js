import { authService } from './auth-service.js';
import { api, newsService } from './news-service.js';
import { escapeHtml as e, pageHeader, button, notice, dateLabel, dataTable } from './components.js';

const actions = content => `<div class="management-actions">${content}</div>`;
const message = () => '<p id="management-message" role="status" aria-live="polite"></p>';
const options = (items, selected) => items.map(item => `<option value="${e(item.id)}" ${item.id === selected ? 'selected' : ''}>${e(item.name)}</option>`).join('');
const statuses = ['draft', 'planned', 'published', 'hidden'].map(id => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1) }));
function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = number => String(number).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}
const scheduledLabel = value => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
let returnPosition;
function editorReturn(params, fallback) {
  const requested = params.get('returnTo') || fallback;
  const hash = /^#\/(?:$|\?|news(?:[/?]|$)|admin(?:\?|$)|server(?:\?|$)|profile(?:\?|$)|account(?:\?|$))/.test(requested) ? requested : fallback;
  const top = Number(params.get('returnScroll'));
  return { hash, top: Number.isFinite(top) ? Math.max(0, top) : 0 };
}
function closeEditor(form) {
  returnPosition = { hash: form.dataset.returnTo || '#/admin', top: Number(form.dataset.returnScroll) || 0 };
  location.hash = returnPosition.hash;
}
export function restoreEditorPosition() {
  if (!returnPosition || location.hash !== returnPosition.hash) return;
  window.scrollTo({ top: returnPosition.top, behavior: 'instant' });
  returnPosition = null;
}
export function profilePage() {
  const account = authService.state.account;
  if (!account) return `${pageHeader('YOUR ACCOUNT', 'Sign in to continue.', 'Your profile is available after signing in.')}<section class="container page-section">${button('Sign in →', '#/account')}</section>`;
  return `${pageHeader('YOUR ACCOUNT', 'Your adventure starts here.', 'Account details and tools for your journey.')}<section class="container page-section profile-grid"><div class="panel"><div class="profile-avatar" aria-hidden="true">${e(account.username.charAt(0).toUpperCase())}</div><h2>${e(account.username)}</h2><p>${account.role === 'admin' ? 'Administrator' : 'Adventurer'}</p><dl class="details-list"><div><dt>Email</dt><dd>${e(account.email || 'Not provided')}</dd></div><div><dt>Joined</dt><dd>${dateLabel(account.createdAt)}</dd></div><div><dt>Account type</dt><dd>Local test account</dd></div></dl>${actions('<button class="button button--outline" data-sign-out>Sign out</button>')}<p id="form-message" role="status"></p></div><div class="management-stack"><div class="panel"><p class="eyebrow">YOUR CHARACTERS</p><h2>Your next chapter awaits.</h2><p>Game characters and progress will appear here when the realm integration is connected.</p></div>${account.role === 'admin' ? `<div class="panel"><p class="eyebrow">ADMINISTRATION</p><h2>The realm journal</h2><p>Create updates, manage articles, and organize news categories.</p>${actions(button('Manage news →', '#/admin') + button('Categories', '#/admin/categories', 'outline') + button('Realm information', '#/admin/realm', 'outline'))}</div>` : ''}</div></section>`;
}
export async function managementPage(path, params) {
  await authService.refresh();
  if (authService.state.account?.role !== 'admin') return `${pageHeader('ADMINISTRATION', 'Access restricted.', 'An administrator account is required.')}<section class="container page-section">${button('Your account →', '#/account')}</section>`;
  const navigation = actions(button('News overview', '#/admin', 'outline') + button('New article', '#/admin/new') + button('Categories', '#/admin/categories', 'outline') + button('Realm information', '#/admin/realm', 'outline'));
  let content;
  const categories = await newsService.categories();
  if (path === 'realm') {
    const destination = editorReturn(params, '#/server');
    const { realm } = await api('realm');
    const fields = [['name', 'Realm name', 80], ['expansion', 'Expansion', 100], ['clientVersion', 'Client version', 30], ['experience', 'Experience rate', 80], ['status', 'Status', 80]];
    content = `<h2>Realm information</h2><p>These values appear on the homepage and server information page. They describe the realm and do not change game server settings.</p><form id="realm-editor" class="editor-form" data-version="${realm.version}" data-return-to="${e(destination.hash)}" data-return-scroll="${destination.top}">${fields.map(([name, label, max]) => `<label for="realm-${name}">${label}</label><input id="realm-${name}" name="${name}" value="${e(realm[name])}" maxlength="${max}" required>`).join('')}<label for="realm-level">Maximum level</label><input id="realm-level" name="maxLevel" type="number" min="1" max="255" step="1" value="${realm.maxLevel}" required>${actions('<button class="button button--primary" type="submit">Save realm information</button>' + button('Cancel', e(destination.hash), 'outline'))}</form>`;
  } else if (path === 'categories') {
    content = `<h2>News categories</h2><p>Deleting a category keeps its articles and marks them as Uncategorized.</p><form id="category-create" class="management-actions"><label for="category-name">New category</label><input id="category-name" name="name" required maxlength="50"><button class="button button--primary">Create category</button></form>${categories.map(category => `<form class="category-row" data-category-id="${e(category.id)}"><label class="sr-only" for="category-${e(category.id)}">Category name</label><input id="category-${e(category.id)}" name="name" value="${e(category.name)}" required maxlength="50"><button class="button button--outline">Save name</button><button class="button button--danger" type="button" data-delete-category="${e(category.id)}">Delete</button></form>`).join('')}`;
  } else if (path === 'new' || path.startsWith('edit/')) {
    const destination = editorReturn(params, '#/admin');
    const returnTo = destination.hash, returnScroll = destination.top;
    const article = path === 'new' ? { title: '', content: '', imageUrl: '', imageAlt: '', categoryId: '', status: 'draft' } : await newsService.article(path.slice(5), true);
    content = `<h2>${article.id ? 'Edit article' : 'New article'}</h2><form id="article-editor" class="editor-form" data-id="${e(article.id || '')}" data-version="${article.version || ''}" data-return-to="${e(returnTo)}" data-return-scroll="${returnScroll}"><label for="article-title">Title</label><input id="article-title" name="title" value="${e(article.title)}" minlength="3" maxlength="160" required><label for="article-content">Content</label><textarea id="article-content" name="content" rows="12" maxlength="50000" required>${e(article.content)}</textarea><p class="content-note">Plain text. Separate paragraphs with a blank line.</p><label for="article-image">Image URL (optional)</label><input id="article-image" name="imageUrl" value="${e(article.imageUrl || '')}" maxlength="2000" placeholder="/images/example.png or https://…"><label for="article-alt">Image description</label><input id="article-alt" name="imageAlt" value="${e(article.imageAlt)}" maxlength="300"><label for="article-category">Category</label><select id="article-category" name="categoryId"><option value="">Uncategorized</option>${options(categories, article.categoryId)}</select><label for="article-status">Visibility</label><select id="article-status" name="status">${options(statuses, article.status)}</select><div class="schedule-fields" ${article.status === 'planned' ? '' : 'hidden'}><label for="article-schedule">Publication date and time</label><input id="article-schedule" name="scheduledAt" type="datetime-local" value="${localDateTime(article.scheduledAt)}" ${article.status === 'planned' ? 'required' : 'disabled'}><p class="content-note">Your timezone: ${e(Intl.DateTimeFormat().resolvedOptions().timeZone)}. Publishes automatically while the server is running.</p></div>${actions('<button class="button button--primary" type="submit">Save article</button>' + button('Cancel', e(returnTo), 'outline'))}</form>`;
  } else {
    const result = await newsService.list(params, true);
    content = `<form id="news-filters" class="management-actions"><label class="sr-only" for="news-search">Search articles</label><input id="news-search" name="q" type="search" placeholder="Search articles…" value="${e(params.get('q') || '')}" maxlength="160"><label class="sr-only" for="news-status">Status</label><select id="news-status" name="status"><option value="">All statuses</option>${options(statuses, params.get('status'))}</select><label class="sr-only" for="news-category">Category</label><select id="news-category" name="category"><option value="">All categories</option>${options(categories, params.get('category'))}</select><button class="button button--outline">Filter</button></form>${dataTable(['Article', 'Category', 'Status', 'Updated', 'Actions'], result.items.map(article => [e(article.title), e(article.categoryName), e(article.status) + (article.scheduledAt ? '<br><small>' + e(scheduledLabel(article.scheduledAt)) + '</small>' : ''), dateLabel(article.updatedAt), actions(button('Edit', `#/admin/edit/${article.id}`, 'outline') + `<button class="button button--danger" data-delete-article="${e(article.id)}" data-version="${article.version}">Delete</button>`)]), 'News management')}<p>${result.total} articles</p>${pagination(result, params, '#/admin')}`;
  }
  return `${pageHeader('ADMINISTRATION', 'The realm journal.', 'Write, organize, and publish your realm updates.')}<section class="container page-section management">${navigation}${message()}<div class="panel">${content}</div></section>`;
}
export function pagination(result, params, base) {
  const link = page => { const query = new URLSearchParams(params); query.set('page', page); return `${base}?${query}`; };
  return actions((result.page > 1 ? button('← Previous', link(result.page - 1), 'outline') : '') + (result.hasMore ? button('Next →', link(result.page + 1), 'outline') : ''));
}
export function confirmAction(title, description) {
  return new Promise(resolve => {
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'confirmation-dialog panel';
    dialog.setAttribute('aria-labelledby', 'confirmation-title');
    dialog.innerHTML = `<h2 id="confirmation-title">${e(title)}</h2><p>${e(description)}</p><form method="dialog">${actions('<button class="button button--outline" value="cancel" autofocus>Cancel</button><button class="button button--danger" value="confirm">Delete</button>')}</form>`;
    document.body.append(dialog);
    dialog.addEventListener('close', () => { const confirmed = dialog.returnValue === 'confirm'; dialog.remove(); previous?.focus(); resolve(confirmed); }, { once: true });
    dialog.showModal();
  });
}
export async function managementClick(event, render) {
  const target = event.target.closest('[data-delete-article], [data-delete-category]');
  if (!target) return false;
  const article = target.dataset.deleteArticle;
  if (!await confirmAction(article ? 'Delete article?' : 'Delete category?', article ? 'This permanently removes the article.' : 'Articles are kept and become Uncategorized.')) return true;
  target.disabled = true;
  try {
    await api(`admin/${article ? 'news' : 'categories'}/${encodeURIComponent(article || target.dataset.deleteCategory)}`, 'DELETE', article ? { version: Number(target.dataset.version) } : undefined);
    await render(false);
  } catch (error) { document.querySelector('#management-message').textContent = error.message; target.disabled = false; }
  return true;
}
export async function managementSubmit(event, render) {
  const form = event.target;
  if (!form.matches('#article-editor, #realm-editor, #category-create, .category-row, #news-filters')) return false;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  if (form.id === 'news-filters') { location.hash = `/admin?${new URLSearchParams(values)}`; return true; }
  const submit = form.querySelector('button[type="submit"], button:not([type])');
  submit.disabled = true;
  try {
    if (form.id === 'realm-editor') {
      await api('admin/realm', 'PUT', { ...values, version: Number(form.dataset.version) });
      closeEditor(form);
    } else if (form.id === 'article-editor') {
      if (values.status === 'planned') {
        const scheduled = new Date(values.scheduledAt);
        if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= Date.now()) throw new Error('Choose a publication date and time in the future.');
        values.scheduledAt = scheduled.toISOString();
      }
      const id = form.dataset.id;
      await api(`admin/news${id ? `/${encodeURIComponent(id)}` : ''}`, id ? 'PUT' : 'POST', { ...values, version: Number(form.dataset.version) });
      closeEditor(form);
    } else {
      await api(`admin/categories${form.dataset.categoryId ? `/${encodeURIComponent(form.dataset.categoryId)}` : ''}`, form.dataset.categoryId ? 'PUT' : 'POST', values);
      await render(false);
    }
  } catch (error) { document.querySelector('#management-message').textContent = error.message; }
  finally { submit.disabled = false; }
  return true;
}
