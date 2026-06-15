export type ForgeStatus = 'open' | 'closed' | 'draft' | 'queued' | 'running' | 'passed' | 'failed' | 'pending' | 'approved';

export type ForgeRepo = {
  repo_id: string;
  slug: string;
  name: string;
  description: string;
  visibility: 'public' | 'private' | 'local';
  default_branch: string;
  owner_node_id: string;
  status: 'active' | 'draft' | 'disabled';
  updated_at: string;
};

export type ForgeIssue = {
  issue_id: string;
  repo_id: string;
  number: number;
  title: string;
  body: string;
  status: 'open' | 'closed';
  labels: string[];
  created_at: string;
};

export type ForgePullRequest = {
  pr_id: string;
  repo_id: string;
  number: number;
  title: string;
  source_branch: string;
  target_branch: string;
  status: 'open' | 'closed' | 'draft';
  review_status: 'pending' | 'approved' | 'changes-requested';
  checks_status: 'pending' | 'passed' | 'failed';
  created_at: string;
};

export type ForgeRelease = {
  release_id: string;
  repo_id: string;
  version: string;
  channel: 'alpha' | 'beta' | 'release-candidate' | 'stable';
  status: 'draft' | 'published';
  artifact_count: number;
  signing_status: 'unsigned' | 'signed' | 'pending';
  created_at: string;
};

export type ForgePackage = {
  package_id: string;
  repo_id: string;
  name: string;
  package_type: 'web-bundle' | 'desktop-app' | 'android-app' | 'node-engine' | 'source-archive';
  version: string;
  channel: string;
  hash_status: 'pending' | 'recorded';
};

export type ForgeBuild = {
  build_id: string;
  repo_id: string;
  source_ref: string;
  runner_node_id: string;
  status: 'queued' | 'running' | 'passed' | 'failed';
  target: string;
  created_at: string;
};

export type ForgeApproval = {
  approval_id: string;
  scope: 'merge' | 'release' | 'package' | 'mirror' | 'node-routing' | 'visibility' | 'ai-action';
  scope_id: string;
  decision: 'pending' | 'approved' | 'rejected';
  reason: string;
  created_at: string;
};

export type ForgeNode = {
  node_id: string;
  name: string;
  node_type: 'phone' | 'laptop' | 'vps-relay' | 'builder' | 'mirror';
  url: string;
  health: 'healthy' | 'unknown' | 'unreachable';
  last_seen: string;
};

export type ForgeAiRequest = {
  ai_request_id: string;
  agent: string;
  provider_type: 'openai-compatible' | 'local-model' | 'private-relay-model' | 'offline-rules-engine' | 'aift-native-model';
  status: 'draft' | 'completed' | 'requires-approval';
  summary: string;
  created_at: string;
};

export type ForgeState = {
  repos: ForgeRepo[];
  issues: ForgeIssue[];
  pull_requests: ForgePullRequest[];
  releases: ForgeRelease[];
  packages: ForgePackage[];
  builds: ForgeBuild[];
  approvals: ForgeApproval[];
  nodes: ForgeNode[];
  ai_requests: ForgeAiRequest[];
};
