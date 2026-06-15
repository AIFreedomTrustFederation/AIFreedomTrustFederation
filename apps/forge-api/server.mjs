import http from 'node:http';
import { readState, resetState } from '../../packages/forge-core/src/store.mjs';
import { createAiRequest, createIssue, createPullRequest, draftRelease, queueBuild, requestApproval } from '../../packages/forge-core/src/records.mjs';
import { createArtifact, createPackage, createReleaseManifest } from '../../packages/forge-core/src/package-records.mjs';
import { exportReleaseManifest, recordArtifactHash } from '../../packages/forge-core/src/artifact-hash.mjs';

const host = process.env.AIFT_FORGE_API_HOST || '127.0.0.1';
const port = Number(process.env.AIFT_FORGE_API_PORT || 4177);

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function send(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(body);
}

const routes = {
  'POST /api/issues': async (req, res) => send(res, 201, createIssue(await readJson(req))),
  'POST /api/pull-requests': async (req, res) => send(res, 201, createPullRequest(await readJson(req))),
  'POST /api/builds': async (req, res) => send(res, 201, queueBuild(await readJson(req))),
  'POST /api/releases': async (req, res) => send(res, 201, draftRelease(await readJson(req))),
  'POST /api/packages': async (req, res) => send(res, 201, createPackage(await readJson(req))),
  'POST /api/artifacts': async (req, res) => send(res, 201, createArtifact(await readJson(req))),
  'POST /api/artifact-hashes': async (req, res) => send(res, 201, recordArtifactHash(await readJson(req))),
  'POST /api/release-manifests': async (req, res) => send(res, 201, createReleaseManifest(await readJson(req))),
  'POST /api/release-exports': async (req, res) => send(res, 201, exportReleaseManifest(await readJson(req))),
  'POST /api/approvals': async (req, res) => send(res, 201, requestApproval(await readJson(req))),
  'POST /api/ai/requests': async (req, res) => send(res, 201, createAiRequest(await readJson(req))),
  'POST /api/reset': async (_req, res) => send(res, 200, resetState())
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, readState());
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, service: 'aift-forge-api' });
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { ok: false, error: 'not-found' });
  try {
    await handler(req, res);
  } catch (error) {
    send(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`AIFT Forge API listening at http://${host}:${port}`);
});
