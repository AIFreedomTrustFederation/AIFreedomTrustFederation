import type { ForgeAiRequest, ForgeApproval, ForgeBuild, ForgeIssue, ForgePackage, ForgePullRequest, ForgeRelease, ForgeRepo, ForgeState } from './types';

const STORAGE_KEY = 'aift-forge-state-v1';

function now() {
  return new Date().toISOString();
}

export function createSeedState(): ForgeState {
  const timestamp = now();
  return {
    repos: [
      {
        repo_id: 'aift-root',
        slug: 'aift-root',
        name: 'AI Freedom Trust Federation Root',
        description: 'Installable AIFT Forge product root and sovereign repo-service foundation.',
        visibility: 'public',
        default_branch: 'main',
        owner_node_id: 'aift-vps-relay-root',
        status: 'active',
        updated_at: timestamp,
      },
    ],
    issues: [
      {
        issue_id: 'issue-1',
        repo_id: 'aift-root',
        number: 1,
        title: 'Implement real local Forge records',
        body: 'Create local records for issues, pull requests, releases, packages, builds, nodes, approvals, and AI requests.',
        status: 'open',
        labels: ['forge', 'local-first'],
        created_at: timestamp,
      },
    ],
    pull_requests: [
      {
        pr_id: 'pr-1',
        repo_id: 'aift-root',
        number: 1,
        title: 'Seed AIFT Forge product UI',
        source_branch: 'feature/forge-ui',
        target_branch: 'main',
        status: 'open',
        review_status: 'pending',
        checks_status: 'pending',
        created_at: timestamp,
      },
    ],
    releases: [
      {
        release_id: 'release-0.1.0-alpha',
        repo_id: 'aift-root',
        version: '0.1.0',
        channel: 'alpha',
        status: 'draft',
        artifact_count: 0,
        signing_status: 'pending',
        created_at: timestamp,
      },
    ],
    packages: [
      {
        package_id: 'pkg-aift-forge-web',
        repo_id: 'aift-root',
        name: 'AIFT Forge Web Bundle',
        package_type: 'web-bundle',
        version: '0.1.0',
        channel: 'alpha',
        hash_status: 'pending',
      },
    ],
    builds: [
      {
        build_id: 'build-1',
        repo_id: 'aift-root',
        source_ref: 'main',
        runner_node_id: 'local-browser',
        status: 'queued',
        target: 'web-bundle',
        created_at: timestamp,
      },
    ],
    approvals: [
      {
        approval_id: 'approval-1',
        scope: 'release',
        scope_id: 'release-0.1.0-alpha',
        decision: 'pending',
        reason: 'Alpha release requires human review before publishing.',
        created_at: timestamp,
      },
    ],
    nodes: [
      {
        node_id: 'aift-vps-relay-root',
        name: 'AIFT VPS Relay Root',
        node_type: 'vps-relay',
        url: 'http://127.0.0.1:3001',
        health: 'unknown',
        last_seen: timestamp,
      },
    ],
    ai_requests: [
      {
        ai_request_id: 'aireq-1',
        agent: 'repo-assistant',
        provider_type: 'offline-rules-engine',
        status: 'completed',
        summary: 'Seeded local AI request record. Provider-neutral integration remains no-secret by default.',
        created_at: timestamp,
      },
    ],
  };
}

export function loadForgeState(): ForgeState {
  if (typeof window === 'undefined') return createSeedState();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seed = createSeedState();
    saveForgeState(seed);
    return seed;
  }
  try {
    return JSON.parse(stored) as ForgeState;
  } catch {
    const seed = createSeedState();
    saveForgeState(seed);
    return seed;
  }
}

export function saveForgeState(state: ForgeState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetForgeState(): ForgeState {
  const seed = createSeedState();
  saveForgeState(seed);
  return seed;
}

function nextNumber(records: Array<{ number: number }>) {
  return records.reduce((max, item) => Math.max(max, item.number), 0) + 1;
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function createIssue(state: ForgeState): ForgeState {
  const issue: ForgeIssue = {
    issue_id: id('issue'),
    repo_id: 'aift-root',
    number: nextNumber(state.issues),
    title: 'New local AIFT Forge issue',
    body: 'This issue was created in the browser-local Forge store.',
    status: 'open',
    labels: ['local-record'],
    created_at: now(),
  };
  return { ...state, issues: [issue, ...state.issues] };
}

export function createPullRequest(state: ForgeState): ForgeState {
  const pr: ForgePullRequest = {
    pr_id: id('pr'),
    repo_id: 'aift-root',
    number: nextNumber(state.pull_requests),
    title: 'New local AIFT Forge pull request',
    source_branch: 'feature/local-change',
    target_branch: 'main',
    status: 'draft',
    review_status: 'pending',
    checks_status: 'pending',
    created_at: now(),
  };
  return { ...state, pull_requests: [pr, ...state.pull_requests] };
}

export function queueBuild(state: ForgeState, target = 'web-bundle'): ForgeState {
  const build: ForgeBuild = {
    build_id: id('build'),
    repo_id: 'aift-root',
    source_ref: 'main',
    runner_node_id: 'local-browser',
    status: 'queued',
    target,
    created_at: now(),
  };
  return { ...state, builds: [build, ...state.builds] };
}

export function draftRelease(state: ForgeState): ForgeState {
  const release: ForgeRelease = {
    release_id: id('release'),
    repo_id: 'aift-root',
    version: `0.1.${state.releases.length}`,
    channel: 'alpha',
    status: 'draft',
    artifact_count: 0,
    signing_status: 'pending',
    created_at: now(),
  };
  return { ...state, releases: [release, ...state.releases] };
}

export function publishPackageRecord(state: ForgeState): ForgeState {
  const pkg: ForgePackage = {
    package_id: id('pkg'),
    repo_id: 'aift-root',
    name: 'AIFT Forge Local Package Record',
    package_type: 'source-archive',
    version: `0.1.${state.packages.length}`,
    channel: 'alpha',
    hash_status: 'pending',
  };
  return { ...state, packages: [pkg, ...state.packages] };
}

export function requestApproval(state: ForgeState, scope: ForgeApproval['scope'] = 'ai-action'): ForgeState {
  const approval: ForgeApproval = {
    approval_id: id('approval'),
    scope,
    scope_id: 'aift-root',
    decision: 'pending',
    reason: 'Human approval requested for a high-trust AIFT Forge action.',
    created_at: now(),
  };
  return { ...state, approvals: [approval, ...state.approvals] };
}

export function createAiRequest(state: ForgeState, agent = 'repo-assistant'): ForgeState {
  const request: ForgeAiRequest = {
    ai_request_id: id('aireq'),
    agent,
    provider_type: 'offline-rules-engine',
    status: 'completed',
    summary: `${agent} generated a local placeholder response. No external provider was contacted.`,
    created_at: now(),
  };
  return { ...state, ai_requests: [request, ...state.ai_requests] };
}
