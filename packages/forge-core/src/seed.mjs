export function now() {
  return new Date().toISOString();
}

export function createSeedState() {
  const timestamp = now();
  return {
    schema: 'aift.forge.state.v1',
    updated_at: timestamp,
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
        updated_at: timestamp
      }
    ],
    issues: [],
    pull_requests: [],
    releases: [],
    packages: [],
    builds: [],
    artifacts: [],
    release_manifests: [],
    approvals: [],
    android_builds: [],
    git_snapshots: [],
    git_transport_events: [],
    git_protocol_events: [],
    tokens: [],
    permissions: [],
    blocked_actions: [],
    protected_write_policies: [
      {
        policy_id: 'policy-aift-root-protected-writes',
        repo_id: 'aift-root',
        protected_refs: ['refs/heads/main', 'refs/heads/master', 'refs/heads/release/*', 'refs/tags/*'],
        require_approval: true,
        status: 'active',
        created_at: timestamp
      }
    ],
    nodes: [
      {
        node_id: 'aift-vps-relay-root',
        name: 'AIFT VPS Relay Root',
        node_type: 'vps-relay',
        url: 'http://127.0.0.1:3001',
        health: 'unknown',
        last_seen: timestamp
      }
    ],
    ai_requests: []
  };
}
