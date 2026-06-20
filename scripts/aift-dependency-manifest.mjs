#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packages = [
  'package.json',
  'apps/product-web/package.json',
  'apps/forge-api/package.json',
  'packages/forge-core/package.json',
  'apps/desktop/package.json',
  'apps/android/package.json'
];

const integrationFallbacks = {
  fastify: 'raw Node HTTP server remains available',
  hono: 'raw Node HTTP server remains available',
  'drizzle-orm': 'JSON store remains available',
  libsql: 'JSON store and sqlite-wasm remain available',
  'better-sqlite3': 'libsql/sqlite-wasm/JSON store remain available',
  yjs: 'automerge and append-only JSON records remain available',
  automerge: 'Yjs and append-only JSON records remain available',
  'isomorphic-git': 'native git bridge remains available',
  'simple-git': 'native git bridge remains available',
  '@lancedb/lancedb': 'SQLite-vec/Qdrant-compatible adapter slot and keyword search remain available',
  'sqlite-vec': 'LanceDB and keyword search remain available',
  '@xenova/transformers': 'Ollama/llama.cpp/vLLM/SGLang adapters remain available',
  'onnxruntime-node': 'Transformers.js and local model server adapters remain available',
  'tree-sitter': 'ripgrep/line-based index remains available',
  '@noble/curves': 'Node crypto remains available for non-identity hashes',
  '@noble/hashes': 'Node crypto remains available for non-signature hashes',
  '@opentelemetry/api': 'local JSON audit log remains available',
  '@opentelemetry/sdk-node': 'local JSON audit log remains available',
  'prom-client': 'local health/state routes remain available',
  zod: 'manual validation helpers remain available',
  vite: 'static bundled HTML fallback remains available',
  typescript: 'plain JavaScript fallback remains available for emergency patches',
  '@capacitor/core': 'bundled web UI remains available in a browser/PWA fallback',
  '@capacitor/android': 'bundled web UI remains available in a browser/PWA fallback',
  '@capacitor/cli': 'manual Android Studio project setup remains available after web build',
  '@capacitor/app': 'browser/PWA lifecycle fallback remains available',
  '@capacitor/device': 'manual device labels remain available',
  '@capacitor/filesystem': 'Capacitor Preferences and local backend records remain available',
  '@capacitor/network': 'API health checks remain available',
  '@capacitor/preferences': 'localStorage and backend settings records remain available',
  vitest: 'node smoke scripts remain available',
  '@playwright/test': 'manual QA checklist remains available',
  eslint: 'TypeScript compiler and manual review remain available',
  prettier: 'manual formatting remains available',
  '@cyclonedx/cyclonedx-npm': 'aift-dependency-manifest remains available',
  'license-checker-rseidelsohn': 'package manifest review remains available'
};

function readJson(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

const inventory = [];
for (const file of packages) {
  const pkg = readJson(file);
  if (!pkg) continue;
  for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, version] of Object.entries(pkg[group] || {})) {
      inventory.push({ package_file: file, workspace: pkg.name, group, name, version, fallback: integrationFallbacks[name] || 'No specific fallback registered yet' });
    }
  }
}

const manifest = {
  schema: 'aift.dependency.manifest.v1',
  generated_at: new Date().toISOString(),
  policy: {
    open_source_first: true,
    no_required_external_rate_limited_services: true,
    local_fallback_required: true,
    package_time_inventory_required: true,
    security_review_required_before_promotion: true
  },
  inventory
};

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/aift-forge-dependencies.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, count: inventory.length, output: 'dist/aift-forge-dependencies.json' }, null, 2));
