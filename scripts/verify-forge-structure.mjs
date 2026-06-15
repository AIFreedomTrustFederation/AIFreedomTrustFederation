#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'package.json',
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
  'docs/INSTALLABLE_APP_ARCHITECTURE.md',
  'scripts/aift-forge-readiness.mjs',
  'apps/product-web/package.json',
  'apps/product-web/index.html',
  'apps/product-web/src/App.tsx',
  'apps/product-web/src/style.css',
  'apps/product-web/tsconfig.json',
  'apps/product-web/vite.config.ts',
  'apps/desktop/package.json',
  'apps/desktop/main.cjs',
  'apps/desktop/fallback.html',
  'apps/android/package.json',
  'apps/android/README.md',
  'apps/android/www/index.html',
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
  for (const workspace of ['apps/product-web', 'apps/desktop', 'apps/android']) {
    if (!workspaces.has(workspace)) fail(`Root package.json missing workspace ${workspace}`);
    else pass(`Workspace registered: ${workspace}`);
  }
  for (const scriptName of ['verify', 'readiness', 'web:build', 'desktop:build:win', 'android:build']) {
    if (!rootPackage.scripts?.[scriptName]) fail(`Root package.json missing script ${scriptName}`);
    else pass(`Root script registered: ${scriptName}`);
  }
}

const webApp = path.join(root, 'apps/product-web/src/App.tsx');
if (fs.existsSync(webApp)) {
  const appText = fs.readFileSync(webApp, 'utf8');
  for (const label of ['AIFT Forge', 'Pull Requests', 'Packages', 'Releases', 'Mirrors', 'Approvals', 'AI Integration', 'ChatGPT-compatible', 'Security Review', 'Build Doctor']) {
    if (!appText.includes(label)) fail(`Product UI missing label: ${label}`);
    else pass(`Product UI includes ${label}`);
  }
}

for (const [file, labels] of [
  ['docs/AIFT_FORGE_SOVEREIGN_POLICY.md', ['No arbitrary rules', 'visible', 'documented', 'versioned', 'locally inspectable']],
  ['docs/AIFT_FORGE_PACKAGING_REQUIREMENTS.md', ['Windows installer', 'Windows portable app', 'Android APK', 'artifact hash', 'signing status']],
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
