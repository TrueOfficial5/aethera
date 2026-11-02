export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const requireValue = (condition, message, status = 400) => { if (!condition) throw new HttpError(status, message); };
export function text(value, name, min = 1, max = 160) {
  requireValue(typeof value === 'string', `${name} must be text.`);
  const result = value.trim();
  requireValue(result.length >= min && result.length <= max, `${name} must be ${min}–${max} characters.`);
  return result;
}
export function imageUrl(value) {
  if (value === '' || value == null) return null;
  const result = text(value, 'Image URL', 1, 2000);
  if (/^(?:\.\/|\/)(?:images|assets)\/[a-zA-Z0-9_./-]+$/.test(result) && !result.includes('..')) return result;
  let url;
  try { url = new URL(result); } catch { throw new HttpError(400, 'Use an HTTPS image URL or a local /images/ or /assets/ path.'); }
  requireValue(url.protocol === 'https:' && !url.username && !url.password, 'Image URLs must use HTTPS without credentials.');
  return url.href;
}
export function articleInput(input) {
  requireValue(input && typeof input === 'object' && !Array.isArray(input), 'Invalid article.');
  requireValue(['draft', 'planned', 'published', 'hidden'].includes(input.status), 'Choose Draft, Planned, Published, or Hidden.');
  let scheduledAt = null;
  if (input.status === 'planned') {
    requireValue(typeof input.scheduledAt === 'string' && /Z$|[+-]\d{2}:\d{2}$/.test(input.scheduledAt), 'Choose a publication date and time.');
    const timestamp = Date.parse(input.scheduledAt);
    requireValue(Number.isFinite(timestamp) && timestamp > Date.now(), 'Publication time must be in the future.');
    scheduledAt = new Date(timestamp).toISOString();
  }
  const categoryId = input.categoryId || null;
  requireValue(categoryId === null || typeof categoryId === 'string', 'Invalid category.');
  return {
    title: text(input.title, 'Title', 3, 160),
    content: text(input.content, 'Content', 1, 50000),
    imageUrl: imageUrl(input.imageUrl),
    imageAlt: input.imageAlt ? text(input.imageAlt, 'Image description', 1, 300) : '',
    categoryId,
    status: input.status,
    scheduledAt,
  };
}
export function pageOptions(url) {
  const page = Number(url.searchParams.get('page') || 1);
  const limit = Number(url.searchParams.get('limit') || 6);
  requireValue(Number.isInteger(page) && page >= 1 && page <= 100000, 'Invalid page.');
  requireValue(Number.isInteger(limit) && limit >= 1 && limit <= 24, 'Invalid page size.');
  const status = url.searchParams.get('status') || '';
  requireValue(!status || ['draft', 'planned', 'published', 'hidden'].includes(status), 'Invalid status.');
  const query = url.searchParams.get('q') || '';
  requireValue(query.length <= 160, 'Search is too long.');
  return { page, limit, category: url.searchParams.get('category') || '', status, query };
}
export function realmInput(input) {
  const maxLevel = Number(input.maxLevel);
  requireValue(Number.isInteger(maxLevel) && maxLevel >= 1 && maxLevel <= 255, 'Maximum level must be a whole number between 1 and 255.');
  return {
    name: text(input.name, 'Realm name', 1, 80),
    expansion: text(input.expansion, 'Expansion', 1, 100),
    clientVersion: text(input.clientVersion, 'Client version', 1, 30),
    experience: text(input.experience, 'Experience rate', 1, 80),
    maxLevel,
    status: text(input.status, 'Status', 1, 80),
  };
}
