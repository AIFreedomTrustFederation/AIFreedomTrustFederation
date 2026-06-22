#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aift-forge-access-'));
process.env.AIFT_FORGE_HOME = tempHome;

const { readState, resetState, writeState } = await import('../packages/forge-core/src/store.mjs');
const { grantRepoPermission } = await import('../packages/forge-core/src/identity.mjs');
const { createLocalToken } = await import('../packages/forge-core/src/token-auth.mjs');
const { resolveGitSmartHttpAccess } = await import('../packages/forge-core/src/git-rpc-http.mjs');
const { checkProtectedWritePolicy, enforceProtectedWritePolicy } = await import('../packages/forge-core/src/protected-write-policy.mjs');

function req(token) {
  return token ? { headers: { authorization: `Bearer ${token}` } } : { headers: {} };
}

resetState();

let access = resolveGitSmartHttpAccess('aift-root', req(), 'git-upload-pack');
assert.equal(access.allowed, true, 'public upload-pack should allow anonymous reads');
assert.equal(access.authenticated, false, 'anonymous public read should stay unauthenticated');

const publicRepo = readState().repos[0];
writeState({ ...readState(), repos: [{ ...publicRepo, visibility: 'local' }] });

access = resolveGitSmartHttpAccess('aift-root', req(), 'git-upload-pack');
assert.equal(access.allowed, false, 'private upload-pack should reject anonymous reads');

const readToken = createLocalToken({ user_id: 'reader', scopes: ['repo:read'] }).issued_token;
grantRepoPermission({ repo_id: 'aift-root', user_id: 'reader', role: 'reader' });
access = resolveGitSmartHttpAccess('aift-root', req(readToken), 'git-upload-pack');
assert.equal(access.allowed, true, 'private upload-pack should allow a repo:read token with permission');

access = resolveGitSmartHttpAccess('aift-root', req(readToken), 'git-receive-pack');
assert.equal(access.allowed, false, 'receive-pack should reject a read-only token');
assert.match(access.reason, /repo:write/, 'read-only write denial should explain missing repo:write scope');

const writeToken = createLocalToken({ user_id: 'writer', scopes: ['repo:write'] }).issued_token;
grantRepoPermission({ repo_id: 'aift-root', user_id: 'writer', role: 'write' });
access = resolveGitSmartHttpAccess('aift-root', req(writeToken), 'git-receive-pack');
assert.equal(access.allowed, true, 'receive-pack should allow a write token with write permission');

let policy = enforceProtectedWritePolicy({
  repo_id: 'aift-root',
  action: 'git-receive-pack',
  ref_updates: [{ ref: 'refs/heads/main', old_oid: '0'.repeat(40), new_oid: '1'.repeat(40) }]
});
assert.equal(policy.allowed, false, 'protected main branch writes should require approval');
assert.match(policy.reason, /protected ref refs\/heads\/main/, 'protected write denial should name the ref');

policy = checkProtectedWritePolicy({
  repo_id: 'aift-root',
  ref_updates: [{ ref: 'refs/heads/feature/smoke', old_oid: '0'.repeat(40), new_oid: '1'.repeat(40) }]
});
assert.equal(policy.allowed, true, 'unprotected feature branch writes should pass protected-write policy');

const blocked = readState().blocked_actions || [];
assert.ok(blocked.length >= 3, 'denied transport attempts should create blocked action records');

fs.rmSync(tempHome, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, check: 'git-smart-http-access', blocked_actions_recorded: blocked.length, protected_write_policy: 'active' }, null, 2));
