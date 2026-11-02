import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './server/database.mjs';
import { DevelopmentAuthProvider, UnconfiguredAuthProvider } from './server/auth.mjs';
import { createApplication } from './server/application.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, 'dist');
const port = Number(process.env.PORT || 4173);
const origin = process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
const development = process.env.AUTH_PROVIDER === 'development';
if (development && (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname))) throw Error('Development authentication is restricted to local testing.');
const store = openDatabase(resolve(directory, process.env.DATABASE_PATH || '.data/site.sqlite'));
const application = createApplication({ store, provider: development ? new DevelopmentAuthProvider(store) : new UnconfiguredAuthProvider(), origin });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };
const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'same-origin');
  try {
    const url = new URL(request.url, origin);
    if (url.pathname.startsWith('/api/')) {
      const chunks = [];
      let length = 0;
      for await (const chunk of request) {
        length += chunk.length;
        if (length > 65536) { response.writeHead(413, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Request is too large.' })); return; }
        chunks.push(chunk);
      }
      const result = await application.handle(new Request(url, { method: request.method, headers: request.headers, ...(!['GET', 'HEAD'].includes(request.method) ? { body: Buffer.concat(chunks) } : {}) }), request.socket.remoteAddress);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const file = resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404).end('Not found'); }
});
const publicationTimer = setInterval(() => {
  try { store.publishDue(); } catch (error) { console.error('Scheduled publication failed:', error.message); }
}, 1000);
publicationTimer.unref();
server.listen(port, '127.0.0.1', () => console.log(`Local: ${origin} | Authentication: ${development ? 'local test accounts' : 'unavailable'}`));
process.on('SIGINT', () => { clearInterval(publicationTimer); server.close(() => { store.close(); process.exit(0); }); });
