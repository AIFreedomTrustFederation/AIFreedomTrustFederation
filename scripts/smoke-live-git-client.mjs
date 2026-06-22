#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aift-forge-live-git-'));
const port = String(4300 + Math.floor(Math.random() * 1000));
const host = '127.0.0.1';
const slug = 'live-smoke';
const apiUrl = `http://${host}:${port}`;
const gitUrl = `${apiUrl}/git/${slug}`;

process.env.AIFT_FORGE_HOME = tempHome;
process.env.AIFT_FORGE_GIT_ROOT = path.join(tempHome, 'repos');
process.env.AIFT_FORGE_STORE = path.join(tempHome, 'forge-state.json');

const { grantRepoPermission } = await import('../packages/forge-core/src/identity.mjs');
const { initBareRepo } = await import('../packages/forge-core/src/git-disk.mjs');
const { resetState, readState } = await import('../packages/forge-core/src/store.mjs');
const { createLocalToken } = await import('../packages/forge-core/src/token-auth.mjs');

function git(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.cwd || tempHome,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'AIFT Smoke',
      GIT_AUTHOR_EMAIL: 'smoke@aift.local',
      GIT_COMMITTER_NAME: 'AIFT Smoke',
      GIT_COMMITTER_EMAIL: 'smoke@aift.local',
      GIT_TERMINAL_PROMPT: '0'
    },
    encoding: 'utf8'
  });
  return result;
}

function assertGit(result, label) {
  assert.equal(result.status, 0, `${label} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  return result;
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('AIFT Forge API did not become healthy in time.');
}

function authedGitArgs(args, token) {
  return ['-c', `http.${apiUrl}/.extraHeader=Authorization: Bearer ${token}`, ...args];
}

resetState();
initBareRepo({ repo_id: slug, slug, name: 'Live Git Smoke', visibility: 'local', default_branch: 'main' });

const seedRepo = path.join(tempHome, 'seed');
fs.mkdirSync(seedRepo, { recursive: true });
assertGit(git(['init', '-b', 'main'], { cwd: seedRepo }), 'seed git init');
fs.writeFileSync(path.join(seedRepo, 'README.md'), '# Live Git Smoke\n\nInitial commit.\n', 'utf8');
assertGit(git(['add', 'README.md'], { cwd: seedRepo }), 'seed git add');
assertGit(git(['commit', '-m', 'Initial live smoke commit'], { cwd: seedRepo }), 'seed git commit');
assertGit(git(['remote', 'add', 'origin', path.join(process.env.AIFT_FORGE_GIT_ROOT, `${slug}.git`)], { cwd: seedRepo }), 'seed remote add');
assertGit(git(['push', 'origin', 'main'], { cwd: seedRepo }), 'seed push main');
assertGit(git(['--git-dir', path.join(process.env.AIFT_FORGE_GIT_ROOT, `${slug}.git`), 'symbolic-ref', 'HEAD', 'refs/heads/main']), 'seed bare HEAD');

const token = createLocalToken({ user_id: 'live-writer', scopes: ['repo:read', 'repo:write'] }).issued_token;
grantRepoPermission({ repo_id: slug, user_id: 'live-writer', role: 'write' });

const server = spawn(process.execPath, ['apps/forge-api/server.mjs'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    AIFT_FORGE_API_HOST: host,
    AIFT_FORGE_API_PORT: port
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';
server.stdout.on('data', (chunk) => {
  stdout += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

try {
  await waitForHealth();

  const cloneDir = path.join(tempHome, 'clone');
  assertGit(git(authedGitArgs(['clone', gitUrl, cloneDir], token)), 'git clone over Smart HTTP');
  assert.equal(fs.existsSync(path.join(cloneDir, 'README.md')), true, 'clone should contain seeded README');

  assertGit(git(authedGitArgs(['fetch', 'origin'], token), { cwd: cloneDir }), 'git fetch over Smart HTTP');

  assertGit(git(['checkout', '-b', 'feature/live-smoke'], { cwd: cloneDir }), 'checkout feature branch');
  fs.appendFileSync(path.join(cloneDir, 'README.md'), 'Feature branch push evidence.\n', 'utf8');
  assertGit(git(['add', 'README.md'], { cwd: cloneDir }), 'feature git add');
  assertGit(git(['commit', '-m', 'Add live smoke feature evidence'], { cwd: cloneDir }), 'feature git commit');
  assertGit(git(authedGitArgs(['push', 'origin', 'feature/live-smoke'], token), { cwd: cloneDir }), 'git push feature branch over Smart HTTP');

  assertGit(git(['checkout', 'main'], { cwd: cloneDir }), 'checkout main');
  fs.appendFileSync(path.join(cloneDir, 'README.md'), 'Protected main push should be denied.\n', 'utf8');
  assertGit(git(['add', 'README.md'], { cwd: cloneDir }), 'main git add');
  assertGit(git(['commit', '-m', 'Attempt protected main write'], { cwd: cloneDir }), 'main git commit');
  const denied = git(authedGitArgs(['push', 'origin', 'main'], token), { cwd: cloneDir });
  assert.notEqual(denied.status, 0, 'protected main push should be denied');
  assert.match(`${denied.stdout}\n${denied.stderr}`, /403|remote end hung up/i);

  const blocked = readState().blocked_actions || [];
  assert.ok(blocked.some((action) => action.policy === 'protected-write' && action.ref === 'refs/heads/main'), 'protected push should record blocked action');

  console.log(JSON.stringify({
    ok: true,
    check: 'live-git-client-smart-http',
    clone: 'passed',
    fetch: 'passed',
    feature_push: 'passed',
    protected_main_push: 'denied',
    blocked_actions_recorded: blocked.length
  }, null, 2));
} finally {
  server.kill();
  fs.rmSync(tempHome, { recursive: true, force: true });
  if (process.env.AIFT_FORGE_SMOKE_DEBUG === 'true') {
    console.error(stdout);
    console.error(stderr);
  }
}
