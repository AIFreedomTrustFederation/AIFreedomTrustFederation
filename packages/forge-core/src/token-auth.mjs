import crypto from 'node:crypto';
import { addRecord, makeId, readState, writeState } from './store.mjs';
import { now } from './seed.mjs';

export function hashToken(token = '') {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function createLocalToken(input = {}) {
  const token = input.token || crypto.randomBytes(32).toString('hex');
  const record = {
    token_id: makeId('token'),
    user_id: input.user_id || 'local-owner',
    name: input.name || 'local automation token',
    token_hash: hashToken(token),
    scopes: input.scopes || ['repo:read', 'repo:write', 'admin:local'],
    status: 'active',
    created_at: now()
  };
  const state = readState();
  const next = writeState({ ...state, tokens: [record, ...(state.tokens || [])] });
  return { ...next, issued_token: token };
}

function roleForScopes(scopes = []) {
  if (scopes.includes('admin:local')) return 'owner';
  if (scopes.includes('repo:write')) return 'write';
  if (scopes.includes('repo:read')) return 'reader';
  return 'guest';
}

export function authenticateToken(input = {}) {
  const token = input.token || input.authorization || '';
  const cleanToken = String(token).replace(/^Bearer\s+/i, '').trim();
  const tokenHash = hashToken(cleanToken);
  const state = readState();
  const record = (state.tokens || []).find((item) => item.token_hash === tokenHash && item.status === 'active');
  if (!record) return { authenticated: false, actor: { user_id: 'anonymous', role: 'guest' }, scopes: [] };
  return {
    authenticated: true,
    actor: {
      user_id: record.user_id,
      display_name: record.user_id,
      node_id: input.node_id || 'local-node',
      role: roleForScopes(record.scopes || [])
    },
    scopes: record.scopes,
    token_id: record.token_id
  };
}

export function revokeToken(input = {}) {
  const state = readState();
  const tokenId = input.token_id;
  const tokens = (state.tokens || []).map((record) => record.token_id === tokenId ? { ...record, status: 'revoked', revoked_at: now() } : record);
  return writeState({ ...state, tokens });
}

export function seedAutomationToken() {
  return createLocalToken({
    user_id: 'local-owner',
    name: 'default local automation token',
    token: process.env.AIFT_FORGE_BOOTSTRAP_TOKEN || 'aift-local-dev-token',
    scopes: ['repo:read', 'repo:write', 'admin:local']
  });
}
