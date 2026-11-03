import { authService } from './auth-service.js';
import { api, newsService } from './news-service.js';
import { escapeHtml as e, pageHeader, button, notice, dateLabel, dataTable, backgroundMedia } from './components.js';
import { avatars, portraitSize, customPortraitUrl } from './avatars.js';

const profilePortrait = account => {
  const avatar = avatars.find(item => item.id === account.avatarId);
  const image = avatar?.id === 'custom' ? customPortraitUrl(account.avatarUrl) : avatar?.image;
  return image ? `<img src="${e(image)}" alt="${e(avatar.name)} portrait" width="104" height="104" referrerpolicy="no-referrer">` : e(account.username.charAt(0).toUpperCase());
};

function chooseAvatar() {
  const account = authService.state.account;
  if (!account) return;
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'confirmation-dialog panel avatar-dialog';
  dialog.setAttribute('aria-labelledby', 'avatar-title');
  dialog.innerHTML = `<p class="eyebrow">YOUR PORTRAIT</p><h2 id="avatar-title">Choose your character.</h2><p>A community portrait, independent of your game characters.</p><form><fieldset class="avatar-options"><legend class="sr-only">Available portraits</legend>${avatars.map(avatar => `<label class="avatar-option"><input type="radio" name="avatarId" value="${avatar.id}" ${account.avatarId === avatar.id ? 'checked' : ''} required>${avatar.image ? `<img src="${avatar.image}" alt="" width="160" height="160">` : '<span class="avatar-custom-tile" aria-hidden="true">＋</span>'}<span>${avatar.name}</span></label>`).join('')}</fieldset><div class="avatar-custom-fields" ${account.avatarId === 'custom' ? '' : 'hidden'}><label for="custom-avatar-url">Image URL</label><input id="custom-avatar-url" name="avatarUrl" type="url" maxlength="2000" placeholder="https://example.com/portrait.png" value="${e(account.avatarUrl || '')}" aria-describedby="avatar-size-help" ${account.avatarId === 'custom' ? 'required' : 'disabled'}><p id="avatar-size-help" class="content-note">At least ${portraitSize.minimum} × ${portraitSize.minimum} pixels. Recommended: ${portraitSize.recommended} × ${portraitSize.recommended} pixels, square. Other shapes are cropped to a circle. Use a direct HTTPS image link.</p><img class="avatar-custom-preview" alt="Custom portrait preview" width="104" height="104" referrerpolicy="no-referrer" hidden><p class="avatar-preview-status" role="status"></p></div><p class="avatar-error" role="alert"></p>${actions('<button class="button button--primary" type="submit">Save portrait</button><button class="button button--outline" type="button" data-avatar-cancel>Cancel</button>')}</form>`;
  const customFields = dialog.querySelector('.avatar-custom-fields');
  const customInput = dialog.querySelector('[name="avatarUrl"]');
  const preview = dialog.querySelector('.avatar-custom-preview');
  const previewStatus = dialog.querySelector('.avatar-preview-status');
  let previewSequence = 0;
  const previewCustom = async () => {
    const sequence = ++previewSequence;
    const url = customPortraitUrl(customInput.value);
    preview.hidden = true;
    previewStatus.textContent = 'Loading preview…';
    try {
      if (!url) throw new Error('Enter a direct HTTPS image URL without credentials.');
      const image = new Image();
      image.referrerPolicy = 'no-referrer';
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('The image took too long to load. Check the URL and try again.')), 10000);
        image.onload = () => { clearTimeout(timer); resolve(); };
        image.onerror = () => { clearTimeout(timer); reject(new Error('Could not load this image. Use a direct, publicly accessible image link.')); };
        image.src = url;
      });
      if (image.naturalWidth < portraitSize.minimum || image.naturalHeight < portraitSize.minimum) throw new Error(`The image must be at least ${portraitSize.minimum} × ${portraitSize.minimum} pixels.`);
      if (sequence === previewSequence && dialog.open) {
        preview.src = url;
        preview.hidden = false;
        previewStatus.textContent = `${image.naturalWidth} × ${image.naturalHeight} pixels · Ready to save`;
      }
      return url;
    } catch (error) {
      if (sequence === previewSequence) previewStatus.textContent = error.message;
      throw error;
    }
  };
  customInput.addEventListener('change', () => { previewCustom().catch(() => {}); });
  dialog.querySelectorAll('[name="avatarId"]').forEach(input => input.addEventListener('change', () => {
    const custom = input.value === 'custom';
    customFields.hidden = !custom;
    customInput.disabled = !custom;
    customInput.required = custom;
    dialog.querySelector('.avatar-error').textContent = '';
    if (custom) {
      customInput.focus();
      if (customInput.value) previewCustom().catch(() => {});
    } else { previewSequence++; preview.hidden = true; }
  }));
  document.body.append(dialog);
  dialog.querySelector('[data-avatar-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { dialog.remove(); previous?.focus({ preventScroll: true }); }, { once: true });
  dialog.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = dialog.querySelector('[type="submit"]');
    submit.disabled = true;
    dialog.querySelector('.avatar-error').textContent = '';
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      if (values.avatarId === 'custom') values.avatarUrl = await previewCustom();
      const result = await api('profile/avatar', 'PUT', values);
      Object.assign(authService.state.account, { avatarId: result.account.avatarId, avatarUrl: result.account.avatarUrl });
      document.querySelectorAll('[data-profile-avatar]').forEach(element => { element.innerHTML = profilePortrait(authService.state.account); });
      dialog.close();
    } catch (error) { dialog.querySelector('.avatar-error').textContent = error.message; }
    finally { submit.disabled = false; }
  });
  dialog.showModal();
  if (account.avatarId === 'custom' && account.avatarUrl) previewCustom().catch(() => {});
}

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
export function profilePage(publicView = false) {
  const account = authService.state.account;
  if (!account) return `${pageHeader('YOUR ACCOUNT', 'Sign in to continue.', 'Your profile is available after signing in.')}<section class="container page-section">${button('Sign in →', '#/account')}</section>`;
  const role = account.role === 'admin' ? 'Administrator' : 'Adventurer';
  const joined = dateLabel(account.createdAt);
  const characters = `<section class="panel profile-characters" aria-labelledby="characters-title"><div class="panel-heading"><div><p class="eyebrow">YOUR CHARACTERS</p><h2 id="characters-title">The story is still unwritten.</h2></div><span class="badge">NOT CONNECTED</span></div><div class="profile-empty"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5 39 12v12c0 9-15 19-15 19S9 33 9 24V12L24 5Z" stroke="currentColor" stroke-width="1.5"/><path d="M24 15v17m-7-10h14" stroke="currentColor" stroke-width="1.5"/></svg><h3>A place for your next adventure.</h3><p>Characters, guilds, and progress will appear here once the realm is connected.</p><span class="content-note">No game server is connected yet.</span></div></section>`;
  const administration = account.role === 'admin' && !publicView ? `<section class="panel"><p class="eyebrow">ADMINISTRATION</p><h2>Behind the realm.</h2><p>Keep your community informed and your realm information up to date.</p>${actions(button('Manage news →', '#/admin') + button('Categories', '#/admin/categories', 'outline') + button('Realm information', '#/admin/realm', 'outline'))}</section>` : '';
  return `<div class="profile-page"><section class="page-heading profile-cover">${backgroundMedia()}<div class="container"><p class="eyebrow">AETHERA COMMUNITY</p><p class="profile-cover-caption">Every legend begins with a name.</p></div></section><section class="container profile-content"><header class="panel profile-identity">${publicView ? `<div class="profile-avatar" data-profile-avatar>${profilePortrait(account)}</div>` : `<button type="button" class="profile-avatar profile-avatar--editable" data-edit-avatar aria-label="Change profile portrait"><span data-profile-avatar>${profilePortrait(account)}</span><span class="profile-avatar-edit" aria-hidden="true">Edit</span></button>`}<div class="profile-identity-copy"><div class="profile-role"><span class="status-dot" aria-hidden="true"></span>${e(role)}</div><h1>${e(account.username)}</h1><p>Member since ${joined}</p></div><div class="profile-identity-action">${button(publicView ? '← My profile' : 'Preview public profile ↗', publicView ? '#/profile' : '#/profile?view=public', 'outline')}</div></header>${publicView ? notice('Public profile preview · Only you can access this preview. Email and account tools are hidden.') : ''}<div class="profile-grid"><aside class="management-stack"><section class="panel"><p class="eyebrow">ABOUT THE PLAYER</p><h2>A new story awaits.</h2><p class="profile-about-empty">No introduction added yet.</p><dl class="details-list"><div><dt>Community role</dt><dd>${e(role)}</dd></div><div><dt>Joined</dt><dd>${joined}</dd></div></dl></section>${publicView ? '' : `<section class="panel profile-private"><div class="panel-heading"><h2>Account details</h2><span class="badge">ONLY YOU</span></div><dl class="details-list"><div><dt>Email</dt><dd>${e(account.email || 'Not provided')}</dd></div><div><dt>Account type</dt><dd>Local test account</dd></div></dl><p class="content-note">Website account only. Game account integration will be added later.</p><p id="form-message" role="status"></p></section>`}</aside><div class="management-stack">${characters}${administration}</div></div></section></div>`;
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
  if (event.target.closest('[data-edit-avatar]')) { chooseAvatar(); return true; }
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
