import { recordBlockedAction } from './identity.mjs';
import { readState } from './store.mjs';

const ZERO_OID = /^0{40,64}$/;

function clean(value) {
  return String(value || '').trim();
}

function defaultProtectedRefs(state, repoId) {
  const repo = (state.repos || []).find((item) => item.repo_id === repoId || item.slug === repoId) || {};
  const defaultBranch = clean(repo.default_branch) || 'main';
  return [
    `refs/heads/${defaultBranch}`,
    'refs/heads/main',
    'refs/heads/master',
    'refs/heads/release/*',
    'refs/tags/*'
  ];
}

function policyFor(state, repoId) {
  const policies = state.protected_write_policies || [];
  const policy = policies.find((item) => item.repo_id === repoId);
  return {
    repo_id: repoId,
    require_approval: policy?.require_approval !== false,
    protected_refs: policy?.protected_refs?.length ? policy.protected_refs : defaultProtectedRefs(state, repoId)
  };
}

function matchesPattern(ref, pattern) {
  if (pattern.endsWith('/*')) return ref.startsWith(pattern.slice(0, -1));
  return ref === pattern;
}

function isProtectedRef(ref, policy) {
  return policy.protected_refs.some((pattern) => matchesPattern(ref, pattern));
}

function approvalMatches(approval, repoId, ref) {
  if (approval.decision !== 'approved') return false;
  if (approval.scope !== 'git-protected-write') return false;
  return approval.scope_id === repoId || approval.scope_id === `${repoId}:${ref}`;
}

function approvedFor(state, repoId, ref) {
  return (state.approvals || []).some((approval) => approvalMatches(approval, repoId, ref));
}

function normalizeUpdate(update = {}) {
  const ref = clean(update.ref || update.ref_name || update.name);
  if (!ref) return null;
  return {
    old_oid: clean(update.old_oid || update.old || update.before),
    new_oid: clean(update.new_oid || update.new || update.after),
    ref
  };
}

export function parseReceivePackUpdates(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input || '');
  const updates = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const sizeText = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = Number.parseInt(sizeText, 16);
    if (!Number.isFinite(size) || size < 0) break;
    offset += 4;
    if (size === 0) break;
    if (size < 4 || offset + size - 4 > buffer.length) break;

    const line = buffer.subarray(offset, offset + size - 4).toString('utf8');
    offset += size - 4;
    const command = line.split('\0')[0].trim();
    const parts = command.split(/\s+/);
    if (parts.length >= 3 && parts[2].startsWith('refs/')) {
      updates.push({ old_oid: parts[0], new_oid: parts[1], ref: parts[2] });
    }
  }

  return updates;
}

export function checkProtectedWritePolicy(input = {}) {
  const repoId = input.repo_id || 'aift-root';
  const state = readState();
  const policy = policyFor(state, repoId);
  const updates = (input.ref_updates || input.updates || [])
    .map(normalizeUpdate)
    .filter(Boolean);

  if (!updates.length) {
    return {
      allowed: false,
      reason: 'Git write operations require inspectable ref update metadata.',
      repo_id: repoId,
      policy
    };
  }

  const blocked = updates.find((update) => {
    if (!isProtectedRef(update.ref, policy)) return false;
    return policy.require_approval && !approvedFor(state, repoId, update.ref);
  });

  if (blocked) {
    const deleting = ZERO_OID.test(blocked.new_oid);
    return {
      allowed: false,
      reason: `${deleting ? 'Deleting' : 'Updating'} protected ref ${blocked.ref} requires approved local git-protected-write approval.`,
      repo_id: repoId,
      ref: blocked.ref,
      policy
    };
  }

  return { allowed: true, repo_id: repoId, updates, policy };
}

export function enforceProtectedWritePolicy(input = {}) {
  const decision = checkProtectedWritePolicy(input);
  if (decision.allowed) return decision;
  recordBlockedAction({
    action: input.action || 'git-protected-write',
    repo_id: input.repo_id || 'aift-root',
    reason: decision.reason,
    actor: input.actor,
    ref: decision.ref,
    policy: 'protected-write'
  });
  return decision;
}
