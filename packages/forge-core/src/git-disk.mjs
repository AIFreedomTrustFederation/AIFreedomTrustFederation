import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { normalizeRepoSlug } from './git-store.mjs';
import { addRecord, makeId, readState, writeState } from './store.mjs';
import { now } from './seed.mjs';

export function gitRoot() {
  return process.env.AIFT_FORGE_GIT_ROOT || path.join(os.homedir(), '.aift-forge', 'repos');
}

export function safeRepoDir(slug = 'repo') {
  const normalized = normalizeRepoSlug(slug);
  return path.join(gitRoot(), `${normalized}.git`);
}

export function runGit(args = [], cwd = gitRoot()) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

export function initBareRepo(input = {}) {
  const slug = normalizeRepoSlug(input.slug || input.name || 'new-repo');
  const repoPath = safeRepoDir(slug);
  fs.mkdirSync(path.dirname(repoPath), { recursive: true });
  const result = runGit(['init', '--bare', repoPath], path.dirname(repoPath));
  const state = readState();
  const repo = {
    repo_id: input.repo_id || makeId('repo'),
    slug,
    name: input.name || slug,
    description: input.description || 'Disk backed AIFT Forge Git repository.',
    visibility: input.visibility || 'local',
    default_branch: input.default_branch || 'main',
    owner_node_id: input.owner_node_id || 'local-node',
    status: result.ok ? 'active' : 'failed',
    storage: {
      adapter: 'local-git',
      path: repoPath,
      initialized: result.ok,
      init_status: result.status,
      init_message: result.ok ? 'initialized' : result.stderr
    },
    updated_at: now()
  };
  return writeState({ ...state, repos: [repo, ...(state.repos || [])] });
}

export function inspectBareRepo(input = {}) {
  const slug = normalizeRepoSlug(input.slug || 'aift-root');
  const repoPath = input.path || safeRepoDir(slug);
  const exists = fs.existsSync(repoPath);
  const branches = exists ? runGit(['--git-dir', repoPath, 'branch', '--list']) : { ok: false, stdout: '', stderr: 'missing repo' };
  const tags = exists ? runGit(['--git-dir', repoPath, 'tag', '--list']) : { ok: false, stdout: '', stderr: 'missing repo' };
  const latest = exists ? runGit(['--git-dir', repoPath, 'log', '-1', '--pretty=%H %s']) : { ok: false, stdout: '', stderr: 'missing repo' };
  return addRecord('git_snapshots', {
    snapshot_id: makeId('git-snapshot'),
    repo_id: input.repo_id || slug,
    slug,
    path: repoPath,
    exists,
    branch_names: branches.stdout.split('\n').map((value) => value.trim()).filter(Boolean),
    tag_names: tags.stdout.split('\n').map((value) => value.trim()).filter(Boolean),
    latest_commit: latest.stdout.trim() || 'pending',
    inspected_at: now()
  });
}
