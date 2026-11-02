import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../demo-dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mp4': 'video/mp4', '.png': 'image/png', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://127.0.0.1:4174').pathname;
    const file = resolve(root, `.${path === '/' ? '/index.html' : decodeURIComponent(path)}`);
    if (!file.startsWith(root + sep) || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(403).end(); return; }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(4174, '127.0.0.1', () => console.log('Browser demo: http://127.0.0.1:4174'));
