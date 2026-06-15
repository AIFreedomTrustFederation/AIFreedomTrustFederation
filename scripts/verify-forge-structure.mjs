#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'package.json',
  '.gitignore',
  '.env.example',
  'README.md',
  'aift-root-manifest.json',
  'aift-forge-manifest.json',
  'aift-ai-manifest.json',
  'docs/AIFT_FORGE_REQUIREMENTS.md',
  'docs/AIFT_FORGE_DATA_MODEL.md',
  'docs/AIFT_FORGE_DESIGN_REQUIREMENTS.md',
  'docs/AIFT_FORGE_AI_INTEGRATION.md',
  'docs/AIFT_FORGE_SOVEREIGN_POLICY.md',
  'docs/AIFT_FORGE_PACKAGING_REQUIREMENTS.md',
  'docs/AIFT_FORGE_BUILD_READINESS.md',
  'docs/AIFT_FORGE_RELEASE_CHECKLIST.md',
  'docs/INSTALLABLE_APP_ARCHITECTURE.md',
  'scripts/aift-forge-readiness.mjs',
  'apps/product-web/package.json',
  'apps/product-web/index.html',
  'apps/product-web/src/App.tsx',
  'apps/product-web/src/style.css',
  'apps/product-web/src/forge/types.ts',
  'apps/product-web/src/forge/store.ts',
  'apps/product-web/src/forge/api.ts',
  'apps/product-web/src/forge/package-store.ts',
  'apps/product-web/tsconfig.json',
  'apps/product-web/vite.config.ts',
  'apps/desktop/package.json',
  'apps/desktop/main.cjs',
  'apps/desktop/fallback.html',
  'apps/desktop/BUILD.md',
  'apps/android/package.json',
  'apps/android/README.md',
  'apps/android/BUILD.md',
  'apps/android/www/index.html',
  'apps/forge-api/package.json',
  'apps/forge-api/server.mjs',
  'packages/forge-core/package.json',
  'packages/forge-core/src/seed.mjs',
  'packages/forge-core/src/store.mjs',
  'packages/forge-core/src/records.mjs',
  'packages/forge-core/src/package-records.mjs',
  'packages/forge-core/src/artifact-hash.mjs',
  'packages/forge-core/src/build-flow.mjs',
  'packages/forge-core/src/git-store.mjs',
  'packages/forge-core/src/git-disk.mjs',
  'packages/forge-core/src/git-refs.mjs',
  'packages/forge-core/src/git-objects.mjs',
  'packages/forge-core/src/identity.mjs',
  'packages/forge-core/src/git-transport.mjs',
];

const requiredJson = [
  'package.json',
  'aift-root-manifest.json',
  'aift-forge-manifest.json',
  'aift-ai-manifest.json',
  'apps/product-web/package.json',
  'apps/product-web/tsconfig.json',
  'apps/desktop/package.json',
  'apps/android/package.json',
  'apps/forge-api/package.json',
  'packages/forge-core/package.json',
];

let failed = false;

function fail(message) {
  failed = true;
  console.error(`✗ ${message}`);
}

function pass(message) {
  console.log(`✓ ${message}`);
}

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) fail(`Missing required file: ${file}`);
  else pass(`Found ${file}`);
}

for (const file of requiredJson) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  try {
    JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    pass(`Valid JSON: ${file}`);
  } catch (error) {
    fail(`Invalid JSON in ${file}: ${error.message}`);
  }
}

const rootPackagePath = path.join(root, 'package.json');
if (fs.existsSync(rootPackagePath)) {
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  const workspaces = new Set(rootPackage.workspaces || []);
  for (const workspace of ['apps/product-web', 'apps/desktop', 'apps/android', 'apps/forge-api', 'packages/forge-core']) {
    if (!workspaces.has(workspace)) fail(`Root package.json missing workspace ${workspace}`);
    else pass(`Workspace registered: ${workspace}`);
  }
  for (const scriptName of ['verify', 'readiness', 'api:dev', 'web:build', 'desktop:build:win', 'android:build']) {
    if (!rootPackage.scripts?.[scriptName]) fail(`Root package.json missing script ${scriptName}`);
    else pass(`Root script registered: ${scriptName}`);
  }
}

const webApp = path.join(root, 'apps/product-web/src/App.tsx');
if (fs.existsSync(webApp)) {
  const appText = fs.readFileSync(webApp, 'utf8');
  for (const label of ['AIFT Forge', 'Pull Requests', 'Packages', 'Artifacts', 'Release Manifests', 'Approvals', 'AI Integration', 'ChatGPT-compatible', 'Security Review', 'Build Doctor', 'Backend API', 'Package Pipeline']) {
    if (!appText.includes(label)) fail(`Product UI missing label: ${label}`);
    else pass(`Product UI includes ${label}`);
  }
}

for (const [file, labels] of [
  ['apps/product-web/src/forge/types.ts', ['ForgeState', 'ForgeIssue', 'ForgePullRequest', 'ForgeAiRequest', 'ForgeArtifact', 'ForgeReleaseManifest']],
  ['apps/product-web/src/forge/store.ts', ['loadForgeState', 'saveForgeState', 'createIssue', 'createPullRequest', 'queueBuild', 'createAiRequest']],
  ['apps/product-web/src/forge/api.ts', ['checkForgeApi', 'fetchForgeState', 'postForgeAction', 'FORGE_API_URL', '/api/packages', '/api/artifacts', '/api/release-manifests']],
  ['apps/product-web/src/forge/package-store.ts', ['createArtifactRecord', 'createReleaseManifestRecord']],
  ['packages/forge-core/src/store.mjs', ['readState', 'writeState', 'resetState', 'addRecord']],
  ['packages/forge-core/src/records.mjs', ['createIssue', 'createPullRequest', 'queueBuild', 'createAiRequest']],
  ['packages/forge-core/src/package-records.mjs', ['createPackage', 'createArtifact', 'createReleaseManifest']],
  ['packages/forge-core/src/artifact-hash.mjs', ['hashText', 'hashFile', 'recordArtifactHash', 'exportReleaseManifest']],
  ['packages/forge-core/src/build-flow.mjs', ['composeBuildFlow', 'hashText', 'artifact', 'approval']],
  ['packages/forge-core/src/git-store.mjs', ['createGitRepoRecord', 'importGitRepoRecord', 'createGitSnapshot', 'local-git']],
  ['packages/forge-core/src/git-disk.mjs', ['initBareRepo', 'inspectBareRepo', 'safeRepoDir', 'runGit']],
  ['packages/forge-core/src/git-refs.mjs', ['listGitBranches', 'listGitTags']],
  ['packages/forge-core/src/git-objects.mjs', ['listGitCommits', 'listGitTree', 'readGitBlob', 'readGitDiff']],
  ['packages/forge-core/src/identity.mjs', ['currentIdentity', 'grantRepoPermission', 'canAccessRepo', 'recordBlockedAction']],
  ['packages/forge-core/src/git-transport.mjs', ['cloneInfo', 'fetchCapability', 'pushCapability']],
  ['apps/forge-api/server.mjs', ['/api/state', '/api/issues', '/api/pull-requests', '/api/builds', '/api/build-flows', '/api/git/repos', '/api/git/init', '/api/git/inspect', '/api/git/clone-info', '/api/git/fetch-capability', '/api/git/push-capability', '/api/permissions/check', '/api/packages', '/api/artifacts', '/api/release-manifests', '/api/ai/requests']],
  ['docs/AIFT_FORGE_SOVEREIGN_POLICY.md', ['No arbitrary rules', 'visible', 'documented', 'versioned', 'locally inspectable']],
  ['docs/AIFT_FORGE_PACKAGING_REQUIREMENTS.md', ['Windows installer', 'Windows portable app', 'Android APK', 'artifact hash', 'signing status']],
  ['docs/AIFT_FORGE_BUILD_READINESS.md', ['Build readiness checklist', 'product web bundle', 'Windows desktop installer', 'Android installable app package']],
  ['docs/AIFT_FORGE_RELEASE_CHECKLIST.md', ['Structure', 'Build verification', 'Package verification', 'Human approval']],
]) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  const text = fs.readFileSync(fullPath, 'utf8');
  for (const label of labels) {
    if (!text.includes(label)) fail(`${file} missing required policy text: ${label}`);
    else pass(`${file} includes ${label}`);
  }
}

if (failed) {
  console.error('\nAIFT Forge structure verification failed.');
  process.exit(1);
}

console.log('\nAIFT Forge structure verification passed.');
