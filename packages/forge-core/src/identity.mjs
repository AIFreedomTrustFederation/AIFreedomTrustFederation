import { addRecord, readState, writeState, makeId } from './store.mjs';
import { now } from './seed.mjs';

export function currentIdentity(input = {}) {
  return {
    user_id: input.user_id || process.env.AIFT_USER_ID || 'local-owner',
    display_name: input.display_name || process.env.AIFT_USER_NAME || 'Local Owner',
    node_id: input.node_id || process.env.AIFT_NODE_ID || 'local-node',
    role: input.role || 'owner'
  };
}

export function grantRepoPermission(input = {}) {
  return addRecord('permissions', {
    permission_id: makeId('permission'),
    repo_id: input.repo_id || 'aift-root',
    user_id: input.user_id || 'local-owner',
    role: input.role || 'owner',
    created_at: now()
  });
}

export function canAccessRepo(input = {}) {
  const state = readState();
  const actor = currentIdentity(input.actor || {});
  const repoId = input.repo_id || 'aift-root';
  const repo = (state.repos || []).find((item) => item.repo_id === repoId || item.slug === repoId);
  const permission = (state.permissions || []).find((item) => item.repo_id === repoId && item.user_id === actor.user_id);
  const allowed = repo?.visibility === 'public' || actor.role === 'owner' || Boolean(permission);
  return { allowed, actor, repo_id: repoId, role: permission?.role || actor.role, visibility: repo?.visibility || 'unknown' };
}

export function recordBlockedAction(input = {}) {
  const state = readState();
  const blocked = {
    blocked_action_id: makeId('blocked-action'),
    action: input.action || 'unknown',
    repo_id: input.repo_id || 'aift-root',
    reason: input.reason || 'Permission required.',
    review_status: 'pending',
    created_at: now()
  };
  return writeState({ ...state, blocked_actions: [blocked, ...(state.blocked_actions || [])] });
}
