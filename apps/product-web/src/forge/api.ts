import type { ForgeState } from './types';

export type ForgeApiStatus = 'checking' | 'online' | 'offline';

export const FORGE_API_URL = import.meta.env.VITE_AIFT_FORGE_API_URL || 'http://127.0.0.1:4177';

async function requestState(path: string, options?: RequestInit): Promise<ForgeState> {
  const response = await fetch(`${FORGE_API_URL}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error(`Forge API request failed: ${response.status}`);
  return response.json();
}

export async function checkForgeApi(): Promise<boolean> {
  try {
    const response = await fetch(`${FORGE_API_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchForgeState(): Promise<ForgeState> {
  return requestState('/api/state');
}

export async function postForgeAction(action: string, body: Record<string, unknown> = {}): Promise<ForgeState> {
  const actionMap: Record<string, string> = {
    issue: '/api/issues',
    pull_request: '/api/pull-requests',
    build: '/api/builds',
    release: '/api/releases',
    approval: '/api/approvals',
    ai_request: '/api/ai/requests',
    reset: '/api/reset',
  };
  const path = actionMap[action];
  if (!path) throw new Error(`Unknown Forge action: ${action}`);
  return requestState(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
