import { canAccessRepo, recordBlockedAction } from './identity.mjs';
import { addRecord, makeId } from './store.mjs';
import { now } from './seed.mjs';

export function cloneInfo(input = {}) {
  const repoId = input.repo_id || 'aift-root';
  const access = canAccessRepo({ repo_id: repoId, actor: input.actor || {} });
  if (!access.allowed) return recordBlockedAction({ action: 'git-clone', repo_id: repoId, reason: 'Read permission required.' });
  return addRecord('git_transport_events', {
    event_id: makeId('git-transport'),
    repo_id: repoId,
    action: 'clone-info',
    clone_command: `aift clone ${repoId}`,
    http_hint: `/git/${repoId}`,
    status: 'ready-for-client-wrapper',
    created_at: now()
  });
}

export function fetchCapability(input = {}) {
  const repoId = input.repo_id || 'aift-root';
  const access = canAccessRepo({ repo_id: repoId, actor: input.actor || {} });
  if (!access.allowed) return recordBlockedAction({ action: 'git-fetch', repo_id: repoId, reason: 'Read permission required.' });
  return addRecord('git_transport_events', {
    event_id: makeId('git-transport'),
    repo_id: repoId,
    action: 'fetch-capability',
    status: 'planned-smart-http',
    service: 'git-upload-pack',
    created_at: now()
  });
}

export function pushCapability(input = {}) {
  const repoId = input.repo_id || 'aift-root';
  const access = canAccessRepo({ repo_id: repoId, actor: input.actor || {} });
  const allowedRoles = ['owner', 'admin', 'write'];
  if (!access.allowed || !allowedRoles.includes(access.role)) {
    return recordBlockedAction({ action: 'git-push', repo_id: repoId, reason: 'Write permission required.' });
  }
  return addRecord('git_transport_events', {
    event_id: makeId('git-transport'),
    repo_id: repoId,
    action: 'push-capability',
    status: 'planned-smart-http',
    service: 'git-receive-pack',
    created_at: now()
  });
}
