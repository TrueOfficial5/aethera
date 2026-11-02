import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { HttpError, requireValue, text } from './validation.mjs';

export const hashToken = value => createHash('sha256').update(value).digest('hex');
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  const [algorithm, salt, hash] = stored.split(':');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex'), actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export class UnconfiguredAuthProvider {
  id = 'unconfigured';
  mode = 'unavailable';
  available = false;
  message = 'WoW account integration is not configured. Login and registration are unavailable.';
  async authenticate() { throw new HttpError(503, this.message); }
  async register() { throw new HttpError(503, this.message); }
}
export class DevelopmentAuthProvider {
  id = 'local-development';
  mode = 'development';
  available = true;
  message = 'Local test accounts only. These credentials do not work in the game.';
  constructor(store) { this.store = store; this.dummyHash = hashPassword(randomBytes(32).toString('hex')); }
  async authenticate({ username, password }) {
    const row = this.store.db.prepare('SELECT * FROM local_credentials WHERE username=?').get(username);
    const valid = verifyPassword(password, row?.password_hash || this.dummyHash);
    requireValue(Boolean(row) && valid, 'Invalid username or password.', 401);
    const account = this.store.account(row.account_id);
    const identity = this.store.db.prepare('SELECT subject FROM accounts WHERE id=?').get(account.id);
    return { subject: identity.subject, username: account.username, email: account.email };
  }
  async register({ username, password, email }) {
    requireValue(/^[a-zA-Z0-9_-]{3,24}$/.test(username), 'Use 3–24 letters, numbers, underscores, or hyphens.');
    requireValue(password.length >= 12, 'Local test passwords need at least 12 characters.');
    requireValue(!this.store.db.prepare('SELECT username FROM local_credentials WHERE username=?').get(username), 'That username is unavailable.', 409);
    const subject = randomBytes(18).toString('hex');
    const passwordHash = hashPassword(password);
    this.store.db.exec('BEGIN IMMEDIATE');
    try {
      const account = this.store.identityAccount(this.id, { subject, username, email });
      this.store.db.prepare('INSERT INTO local_credentials VALUES(?,?,?)').run(username, account.id, passwordHash);
      this.store.db.exec('COMMIT');
    } catch (error) { this.store.db.exec('ROLLBACK'); throw error; }
    return { subject, username, email };
  }
}
export function createAuthService(store, provider, { secure = false, sessionDays = 7 } = {}) {
  const cookieName = secure ? '__Host-aethera_session' : 'aethera_session';
  const cookie = (token, maxAge) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  const lifespan = sessionDays * 86400;
  const requestToken = request => request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  function current(request) {
    const token = requestToken(request);
    if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
    const session = store.db.prepare('SELECT account_id FROM sessions WHERE token_hash=? AND expires_at>?').get(hashToken(token), Date.now());
    return session ? store.account(session.account_id) : null;
  }
  function logout(request) {
    const token = requestToken(request);
    if (token) store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hashToken(token));
    return cookie('', 0);
  }
  async function login(input, register = false) {
    requireValue(provider.available, provider.message, 503);
    const username = text(input.username, 'Username', 1, 128);
    requireValue(typeof input.password === 'string' && input.password.length > 0 && input.password.length <= 256, 'Invalid password.');
    const email = input.email ? text(input.email, 'Email', 3, 254) : null;
    if (email) requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Invalid email address.');
    const identity = await provider[register ? 'register' : 'authenticate']({ username, password: input.password, email });
    requireValue(identity && typeof identity.subject === 'string' && identity.subject.length > 0 && typeof identity.username === 'string', 'Authentication provider returned an invalid identity.', 502);
    const account = store.identityAccount(provider.id, identity);
    const token = randomBytes(32).toString('base64url');
    store.db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
    store.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hashToken(token), account.id, Date.now() + lifespan * 1000, Date.now());
    return { account, cookie: cookie(token, lifespan) };
  }
  return { current, login, logout, status: () => ({ available: provider.available, mode: provider.mode, message: provider.message, provider: provider.id }) };
}
