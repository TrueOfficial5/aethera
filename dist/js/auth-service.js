let state = { account: null, authentication: { available: false, message: 'Account services are unavailable.' } };
async function request(action = 'session', values) {
  let response;
  try {
    response = await fetch(`/api/auth/${action}`, { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(10000), ...(values !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) } : {}) });
  } catch { throw new Error('Cannot reach account services. Check that the local test server is running and try again.'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('This preview is not connected to account services. Start the site with npm run dev:test.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Account request failed.');
  return result;
}
export const authService = {
  get state() { return state; },
  async refresh() { try { state = await request(); } catch (error) { state = { account: null, authentication: { available: false, retryable: true, message: error.message } }; } return state; },
  async signIn(values, register = false) { state = await request(register ? 'register' : 'login', values); return state; },
  async signOut() { await request('logout', {}); return this.refresh(); },
};
