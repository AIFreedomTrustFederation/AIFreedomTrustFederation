import { canAccessRepo, recordBlockedAction } from './identity.mjs';
import { addRecord, makeId } from './store.mjs';
import { now } from './seed.mjs';

export function serviceDiscovery(input = {}) {
  const repoId = input.repo_id || 'aift-root';
  const service = input.service || 'git-upload-pack';
  const access = canAccessRepo({ repo_id: repoId, actor: input.actor || {} });
  if (!access.allowed) return recordBlockedAction({ action: service, repo_id: repoId, reason: 'Repository access required.' });
  return addRecord('git_protocol_events', {
    event_id: makeId('git-protocol'),
    repo_id: repoId,
    action: 'service-discovery',
    service,
    status: 'discovered',
    content_type: `application/x-${service}-advertisement`,
    created_at: now()
  });
}

export function uploadPackRequest(input = {}) {
  const repoId = input.repo_id || 'aift-root';
  const access = canAccessRepo({ repo_id: repoId, actor: input.actor || {} });
  if (!access.allowed) return recordBlockedAction({ action: 'git-upload-pack', repo_id: repoId, reason: 'Read permission required.' });
  return addRecord('git_protocol_events', {
    event_id: makeId('git-protocol'),
    repo_id: repoId,
    action: 'upload-pack-request',
    service: 'git-upload-pack',
    status: 'packfile-streaming-pending',
    created_at: now()
  });
}

export function receivePackRequest(input = {}) {
  const repoId = input.repo_id || 'aift-root';
  const access = canAccessRepo({ repo_id: repoId, actor: input.actor || {} });
  if (!access.allowed || !['owner', 'admin', 'write'].includes(access.role)) {
    return recordBlockedAction({ action: 'git-receive-pack', repo_id: repoId, reason: 'Write permission required.' });
  }
  return addRecord('git_protocol_events', {
    event_id: makeId('git-protocol'),
    repo_id: repoId,
    action: 'receive-pack-request',
    service: 'git-receive-pack',
    status: 'packfile-streaming-pending',
    created_at: now()
  });
}
