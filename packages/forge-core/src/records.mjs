import { addRecord, makeId, nextNumber, readState } from './store.mjs';
import { now } from './seed.mjs';

export function createIssue(input = {}) {
  const state = readState();
  return addRecord('issues', {
    issue_id: makeId('issue'),
    repo_id: input.repo_id || 'aift-root',
    number: nextNumber(state.issues),
    title: input.title || 'New AIFT Forge issue',
    body: input.body || 'Created through the AIFT Forge local backend.',
    status: 'open',
    labels: input.labels || ['local-backend'],
    created_at: now()
  });
}

export function createPullRequest(input = {}) {
  const state = readState();
  return addRecord('pull_requests', {
    pr_id: makeId('pr'),
    repo_id: input.repo_id || 'aift-root',
    number: nextNumber(state.pull_requests),
    title: input.title || 'New AIFT Forge pull request',
    source_branch: input.source_branch || 'feature/local-backend',
    target_branch: input.target_branch || 'main',
    status: 'draft',
    review_status: 'pending',
    checks_status: 'pending',
    created_at: now()
  });
}

export function queueBuild(input = {}) {
  return addRecord('builds', {
    build_id: makeId('build'),
    repo_id: input.repo_id || 'aift-root',
    source_ref: input.source_ref || 'main',
    runner_node_id: input.runner_node_id || 'local-backend',
    status: 'queued',
    target: input.target || 'web-bundle',
    created_at: now()
  });
}

export function createAiRequest(input = {}) {
  return addRecord('ai_requests', {
    ai_request_id: makeId('aireq'),
    agent: input.agent || 'repo-assistant',
    provider_type: input.provider_type || 'offline-rules-engine',
    status: 'completed',
    summary: input.summary || 'Local backend AI placeholder completed. No external provider was contacted.',
    created_at: now()
  });
}

export function draftRelease(input = {}) {
  const state = readState();
  return addRecord('releases', {
    release_id: makeId('release'),
    repo_id: input.repo_id || 'aift-root',
    version: input.version || `0.1.${state.releases.length}`,
    channel: input.channel || 'alpha',
    status: 'draft',
    artifact_count: 0,
    signing_status: 'pending',
    created_at: now()
  });
}

export function requestApproval(input = {}) {
  return addRecord('approvals', {
    approval_id: makeId('approval'),
    scope: input.scope || 'ai-action',
    scope_id: input.scope_id || 'aift-root',
    decision: 'pending',
    reason: input.reason || 'Human approval requested for a high-trust AIFT Forge action.',
    created_at: now()
  });
}
