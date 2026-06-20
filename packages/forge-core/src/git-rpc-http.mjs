import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { canAccessRepo, recordBlockedAction } from './identity.mjs';
import { safeRepoDir } from './git-disk.mjs';
import { normalizeRepoSlug } from './git-store.mjs';
import { authenticateToken } from './token-auth.mjs';

const SERVICES = new Set(['git-upload-pack', 'git-receive-pack']);

function pktLine(text) {
  const size = Buffer.byteLength(text) + 4;
  return Buffer.from(size.toString(16).padStart(4, '0') + text, 'utf8');
}

const FLUSH = Buffer.from('0000', 'utf8');

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function sendRaw(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendText(res, status, text) {
  sendRaw(res, status, { 'content-type': 'text/plain; charset=utf-8' }, Buffer.from(text, 'utf8'));
}

function repoFromPath(pathname) {
  const match = pathname.match(/^\/git\/([^/]+)\/(info\/refs|git-upload-pack|git-receive-pack)$/);
  if (!match) return null;
  return { repo_id: normalizeRepoSlug(match[1]), action: match[2] };
}

function repoPathFor(repo_id) {
  return safeRepoDir(repo_id);
}

function authHeader(req) {
  return req.headers?.authorization || req.headers?.Authorization || '';
}

function requestSession(req) {
  const session = authenticateToken({ authorization: authHeader(req) });
  if (session.authenticated) return session;
  return {
    authenticated: false,
    actor: {
      user_id: 'anonymous',
      display_name: 'Anonymous',
      node_id: 'local-node',
      role: 'guest'
    },
    scopes: []
  };
}

function hasScope(scopes = [], requiredScope) {
  if (scopes.includes('admin:local')) return true;
  if (requiredScope === 'repo:read' && scopes.includes('repo:write')) return true;
  return scopes.includes(requiredScope);
}

function denied(repo_id, service, reason) {
  recordBlockedAction({ action: service, repo_id, reason });
  return { allowed: false, reason };
}

export function resolveGitSmartHttpAccess(repo_id, req, service) {
  const isWrite = service === 'git-receive-pack';
  const session = requestSession(req);
  const access = canAccessRepo({ repo_id, actor: session.actor });

  if (!access.allowed) {
    return denied(repo_id, service, 'Repository access required.');
  }

  if (!isWrite) {
    if (access.visibility !== 'public' && !hasScope(session.scopes, 'repo:read')) {
      return denied(repo_id, service, 'Private repository reads require a local token with repo:read scope.');
    }
    return { allowed: true, actor: access.actor, role: access.role, authenticated: session.authenticated };
  }

  if (!session.authenticated) {
    return denied(repo_id, service, 'Git write operations require a valid local token.');
  }
  if (!hasScope(session.scopes, 'repo:write')) {
    return denied(repo_id, service, 'Git write operations require repo:write scope.');
  }
  if (!['owner', 'admin', 'write'].includes(access.role)) {
    return denied(repo_id, service, 'Git write operations require owner, admin, or write role.');
  }

  return { allowed: true, actor: access.actor, role: access.role, authenticated: true };
}

function runGitService(service, repoPath, input) {
  return spawnSync('git', [service, '--stateless-rpc', repoPath], {
    input,
    maxBuffer: 1024 * 1024 * 128
  });
}

function advertiseRefs(service, repoPath) {
  return spawnSync('git', [service, '--stateless-rpc', '--advertise-refs', repoPath], {
    maxBuffer: 1024 * 1024 * 32
  });
}

export async function handleGitSmartHttp(req, res, url) {
  const parsed = repoFromPath(url.pathname);
  if (!parsed) return false;

  const { repo_id, action } = parsed;
  const repoPath = repoPathFor(repo_id);
  if (!fs.existsSync(repoPath)) {
    sendText(res, 404, `AIFT Forge Git repo not found: ${repo_id}`);
    return true;
  }

  if (req.method === 'GET' && action === 'info/refs') {
    const service = url.searchParams.get('service') || '';
    if (!SERVICES.has(service)) {
      sendText(res, 400, 'Unsupported Git service.');
      return true;
    }
    const access = resolveGitSmartHttpAccess(repo_id, req, service);
    if (!access.allowed) {
      sendText(res, 403, `AIFT Forge permission denied: ${access.reason}`);
      return true;
    }
    const result = advertiseRefs(service, repoPath);
    if (result.status !== 0) {
      sendText(res, 500, result.stderr?.toString('utf8') || 'Git advertise refs failed.');
      return true;
    }
    const body = Buffer.concat([pktLine(`# service=${service}\n`), FLUSH, result.stdout]);
    sendRaw(res, 200, {
      'content-type': `application/x-${service}-advertisement`,
      'cache-control': 'no-cache'
    }, body);
    return true;
  }

  if (req.method === 'POST' && (action === 'git-upload-pack' || action === 'git-receive-pack')) {
    const service = action;
    const access = resolveGitSmartHttpAccess(repo_id, req, service);
    if (!access.allowed) {
      sendText(res, 403, `AIFT Forge permission denied: ${access.reason}`);
      return true;
    }
    const input = await readRaw(req);
    const result = runGitService(service, repoPath, input);
    if (result.status !== 0) {
      sendText(res, 500, result.stderr?.toString('utf8') || 'Git RPC failed.');
      return true;
    }
    sendRaw(res, 200, {
      'content-type': `application/x-${service}-result`,
      'cache-control': 'no-cache'
    }, result.stdout);
    return true;
  }

  sendText(res, 405, 'Method not allowed for Git smart HTTP endpoint.');
  return true;
}
