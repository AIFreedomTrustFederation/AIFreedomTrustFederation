import { runGit } from './git-disk.mjs';
import { resolveRepoPath } from './git-refs.mjs';

export function listGitCommits(input = {}) {
  const repoPath = resolveRepoPath(input);
  const ref = input.ref || 'HEAD';
  const limit = String(input.limit || 25);
  const result = runGit(['--git-dir', repoPath, 'log', `-${limit}`, '--pretty=%H%x09%an%x09%ad%x09%s', ref]);
  return {
    ok: result.ok,
    repo_path: repoPath,
    commits: result.stdout.split('\n').filter(Boolean).map((line) => {
      const [sha, author, date, subject] = line.split('\t');
      return { sha, author, date, subject };
    }),
    error: result.stderr
  };
}

export function listGitTree(input = {}) {
  const repoPath = resolveRepoPath(input);
  const ref = input.ref || 'HEAD';
  const treePath = input.tree_path || '';
  const target = treePath ? `${ref}:${treePath}` : ref;
  const result = runGit(['--git-dir', repoPath, 'ls-tree', target]);
  return {
    ok: result.ok,
    repo_path: repoPath,
    ref,
    tree_path: treePath,
    entries: result.stdout.split('\n').filter(Boolean).map((line) => {
      const [meta, name] = line.split('\t');
      const [mode, type, sha] = meta.split(' ');
      return { mode, type, sha, name };
    }),
    error: result.stderr
  };
}

export function readGitBlob(input = {}) {
  const repoPath = resolveRepoPath(input);
  const ref = input.ref || 'HEAD';
  const filePath = input.file_path || 'README.md';
  const result = runGit(['--git-dir', repoPath, 'show', `${ref}:${filePath}`]);
  return {
    ok: result.ok,
    repo_path: repoPath,
    ref,
    file_path: filePath,
    content: result.stdout,
    error: result.stderr
  };
}

export function readGitDiff(input = {}) {
  const repoPath = resolveRepoPath(input);
  const base = input.base || 'HEAD~1';
  const head = input.head || 'HEAD';
  const result = runGit(['--git-dir', repoPath, 'diff', base, head]);
  return {
    ok: result.ok,
    repo_path: repoPath,
    base,
    head,
    diff: result.stdout,
    error: result.stderr
  };
}
