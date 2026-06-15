import path from 'node:path';
import { addRecord, makeId, readState, writeState } from './store.mjs';
import { now } from './seed.mjs';

export function normalizeRepoSlug(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'repo';
}

export function defaultRepoPath(slug) {
  return path.join('repos', `${normalizeRepoSlug(slug)}.git`);
}

export function createGitRepoRecord(input = {}) {
  const slug = normalizeRepoSlug(input.slug || input.name || 'new-repo');
  return addRecord('repos', {
    repo_id: input.repo_id || makeId('repo'),
    slug,
    name: input.name || slug,
    description: input.description || 'AIFT Forge local Git repository record.',
    visibility: input.visibility || 'local',
    default_branch: input.default_branch || 'main',
    owner_node_id: input.owner_node_id || 'local-node',
    status: 'active',
    storage: {
      adapter: 'local-git',
      path: input.path || defaultRepoPath(slug),
      initialized: false
    },
    updated_at: now()
  });
}

export function importGitRepoRecord(input = {}) {
  const slug = normalizeRepoSlug(input.slug || input.name || 'imported-repo');
  return addRecord('repos', {
    repo_id: input.repo_id || makeId('repo'),
    slug,
    name: input.name || slug,
    description: input.description || 'Imported AIFT Forge local Git repository record.',
    visibility: input.visibility || 'local',
    default_branch: input.default_branch || 'main',
    owner_node_id: input.owner_node_id || 'local-node',
    status: 'active',
    storage: {
      adapter: 'local-git',
      path: input.path || defaultRepoPath(slug),
      initialized: true,
      imported_from: input.imported_from || 'local-path'
    },
    updated_at: now()
  });
}

export function createGitSnapshot(input = {}) {
  const state = readState();
  const snapshots = Array.isArray(state.git_snapshots) ? state.git_snapshots : [];
  const snapshot = {
    snapshot_id: makeId('git-snapshot'),
    repo_id: input.repo_id || 'aift-root',
    branch: input.branch || 'main',
    tags: input.tags || [],
    commit_count: input.commit_count || 0,
    latest_commit: input.latest_commit || 'pending',
    file_count: input.file_count || 0,
    created_at: now()
  };
  return writeState({ ...state, git_snapshots: [snapshot, ...snapshots] });
}
