import { createAuthService, UnconfiguredAuthProvider } from './auth.mjs';
import { HttpError, requireValue, text, articleInput, pageOptions, realmInput } from './validation.mjs';

export function createApplication({ store, provider = new UnconfiguredAuthProvider(), origin = 'http://127.0.0.1:4173', secure = origin.startsWith('https:') }) {
  const auth = createAuthService(store, provider, { secure });
  const attempts = new Map();
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), { status, headers: { ...headers, ...extra } });
  function rateLimit(client) {
    const now = Date.now();
    if (attempts.size > 10000) for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    requireValue(attempts.size <= 10000, 'Please try again later.', 429);
    let item = attempts.get(client);
    if (!item || item.until < now) { item = { count: 0, until: now + 900000 }; attempts.set(client, item); }
    requireValue(++item.count <= 15, 'Too many login attempts. Try again in 15 minutes.', 429);
  }
  async function body(request) {
    requireValue(request.headers.get('content-type')?.split(';')[0].trim() === 'application/json', 'Send JSON content.', 415);
    const raw = await request.text();
    requireValue(Buffer.byteLength(raw) <= 65536, 'Request is too large.', 413);
    try {
      const value = JSON.parse(raw);
      requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Invalid JSON body.');
      return value;
    } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Invalid JSON body.'); }
  }
  const version = value => { requireValue(Number.isInteger(value) && value >= 1, 'A current article version is required.'); return value; };
  return {
    auth,
    async handle(request, client = 'local') {
      try {
        const url = new URL(request.url), method = request.method;
        const path = url.pathname.replace(/\/$/, '');
        requireValue(['GET', 'POST', 'PUT', 'DELETE'].includes(method), 'Method not allowed.', 405);
        if (method !== 'GET') requireValue(request.headers.get('origin') === origin && request.headers.get('sec-fetch-site') !== 'cross-site', 'Request origin is not allowed.', 403);
        const account = auth.current(request);
        if (path.startsWith('/api/admin')) {
          requireValue(account, 'Sign in to continue.', 401);
          requireValue(account.role === 'admin', 'Administrator permission is required.', 403);
        }
        if (path === '/api/auth/session' && method === 'GET') return json({ account, authentication: auth.status() });
        if (path === '/api/profile/avatar' && method === 'PUT') {
          requireValue(account, 'Sign in to continue.', 401);
          const input = await body(request);
          return json({ account: store.updateAvatar(account.id, input.avatarId, input.avatarUrl) });
        }
        if (['/api/auth/login', '/api/auth/register'].includes(path) && method === 'POST') {
          rateLimit(client);
          const result = await auth.login(await body(request), path.endsWith('/register'));
          auth.logout(request);
          return json({ account: result.account, authentication: auth.status() }, 200, { 'Set-Cookie': result.cookie });
        }
        if (path === '/api/auth/logout' && method === 'POST') return json({ success: true }, 200, { 'Set-Cookie': auth.logout(request) });
        if (path === '/api/realm' && method === 'GET') return json({ realm: store.realm() });
        if (path === '/api/admin/realm' && method === 'PUT') {
          const input = await body(request);
          return json({ realm: store.updateRealm(realmInput(input), version(input.version)) });
        }
        if (path === '/api/categories' && method === 'GET') return json({ items: store.categories() });
        if (path === '/api/news' && method === 'GET') return json(store.listArticles(pageOptions(url)));
        const publicArticle = path.match(/^\/api\/news\/([^/]+)$/);
        if (publicArticle && method === 'GET') {
          const article = store.article(decodeURIComponent(publicArticle[1]));
          requireValue(article, 'Article not found.', 404);
          return json({ article });
        }
        if (path === '/api/admin/news' && method === 'GET') return json(store.listArticles(pageOptions(url), true));
        if (path === '/api/admin/news' && method === 'POST') return json({ article: store.createArticle(articleInput(await body(request)), account) }, 201);
        const article = path.match(/^\/api\/admin\/news\/([^/]+)$/);
        if (article) {
          const id = decodeURIComponent(article[1]);
          if (method === 'GET') { const result = store.article(id, true); requireValue(result, 'Article not found.', 404); return json({ article: result }); }
          if (method === 'PUT') { const input = await body(request); return json({ article: store.updateArticle(id, articleInput(input), version(input.version)) }); }
          if (method === 'DELETE') { const input = await body(request); store.deleteArticle(id, version(input.version)); return json({ success: true }); }
        }
        if (path === '/api/admin/categories' && method === 'POST') return json({ category: store.createCategory(text((await body(request)).name, 'Category', 1, 50)) }, 201);
        const category = path.match(/^\/api\/admin\/categories\/([^/]+)$/);
        if (category) {
          const id = decodeURIComponent(category[1]);
          if (method === 'PUT') return json({ category: store.renameCategory(id, text((await body(request)).name, 'Category', 1, 50)) });
          if (method === 'DELETE') { store.deleteCategory(id); return json({ success: true }); }
        }
        throw new HttpError(404, 'Endpoint not found.');
      } catch (error) {
        if (!(error instanceof HttpError)) console.error('API error:', error.message);
        return json({ error: error instanceof HttpError ? error.message : 'An unexpected server error occurred.' }, error instanceof HttpError ? error.status : 500);
      }
    },
  };
}
