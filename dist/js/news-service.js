export async function api(path, method = 'GET', body) {
  const response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', cache: 'no-store', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('News services require the local Node server on port 4173.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
export const newsService = {
  list: (params = new URLSearchParams(), admin = false) => api(`${admin ? 'admin/' : ''}news?${params}`),
  article: (id, admin = false) => api(`${admin ? 'admin/' : ''}news/${encodeURIComponent(id)}`).then(result => result.article),
  categories: () => api('categories').then(result => result.items),
};
