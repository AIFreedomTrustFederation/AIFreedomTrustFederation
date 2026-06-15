import { runGit, safeRepoDir } from './git-disk.mjs';

export function resolveRepoPath(input = {}) {
  return input.path || safeRepoDir(input.slug || 'aift-root');
}

export function listGitBranches(input = {}) {
  const repoPath = resolveRepoPath(input);
  const result = runGit(['--git-dir', repoPath, 'branch', '--list']);
  return {
    ok: result.ok,
    repo_path: repoPath,
    branches: result.stdout.split('\n').map((value) => value.trim().replace(/^\*\s*/, '')).filter(Boolean),
    error: result.stderr
  };
}

export function listGitTags(input = {}) {
  const repoPath = resolveRepoPath(input);
  const result = runGit(['--git-dir', repoPath, 'tag', '--list']);
  return {
    ok: result.ok,
    repo_path: repoPath,
    tags: result.stdout.split('\n').map((value) => value.trim()).filter(Boolean),
    error: result.stderr
  };
}
