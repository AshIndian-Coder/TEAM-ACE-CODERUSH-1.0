/**
 * API Client - Talks to RouMi Backend (Render) if VITE_API_URL set, otherwise uses local engine
 */

const API_URL = import.meta.env.VITE_API_URL || '';

export const isBackendEnabled = !!API_URL;

export async function apiGet(path: string) {
  if (!isBackendEnabled) return null;
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: any) {
  if (!isBackendEnabled) return null;
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string) {
  if (!isBackendEnabled) return null;
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API ${path} failed`);
  return res.json();
}

// Backend health check
export async function checkBackendHealth() {
  if (!isBackendEnabled) return { status: 'local', message: 'Using local in-memory engine (no backend)' };
  try {
    const health = await apiGet('/api/health');
    return { status: 'connected', ...health };
  } catch (e: any) {
    return { status: 'error', message: e.message };
  }
}
