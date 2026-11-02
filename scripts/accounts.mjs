import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openDatabase } from '../server/database.mjs';
import { DevelopmentAuthProvider } from '../server/auth.mjs';

if (process.env.NODE_ENV === 'production') throw Error('Use your production identity provider to provision accounts.');
const options = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, args) => index % 2 === 0 ? [...pairs, [value.replace(/^--/, ''), args[index + 1]]] : pairs, []));
if (!options.username || !['user', 'admin'].includes(options.role || 'user')) throw Error('Usage: node scripts/accounts.mjs --username NAME --role user|admin');
const store = openDatabase(resolve(process.env.DATABASE_PATH || '.data/site.sqlite'));
try {
  const provider = new DevelopmentAuthProvider(store);
  const password = randomBytes(18).toString('base64url');
  await provider.register({ username: options.username, password });
  const row = store.db.prepare('SELECT account_id FROM local_credentials WHERE username=?').get(options.username);
  store.setRole(row.account_id, options.role || 'user');
  console.log(JSON.stringify({ username: options.username, password, role: options.role || 'user', mode: 'Local development only' }));
} finally { store.close(); }
