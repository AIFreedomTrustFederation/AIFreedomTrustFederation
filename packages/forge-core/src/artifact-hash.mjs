import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readState, writeState } from './store.mjs';
import { now } from './seed.mjs';

export function hashText(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function hashFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const data = fs.readFileSync(absolutePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function recordArtifactHash(input = {}) {
  const state = readState();
  const artifacts = Array.isArray(state.artifacts) ? state.artifacts : [];
  const artifactId = input.artifact_id;
  const hash = input.file_path ? hashFile(input.file_path) : hashText(input.value || artifactId || now());
  const nextArtifacts = artifacts.map((artifact) => {
    if (artifactId && artifact.artifact_id !== artifactId) return artifact;
    return { ...artifact, sha256: hash, hash_status: 'recorded', updated_at: now() };
  });
  if (!artifactId && artifacts.length === 0) {
    nextArtifacts.push({
      artifact_id: `artifact-hash-${Date.now()}`,
      repo_id: input.repo_id || 'aift-root',
      package_id: input.package_id || 'pending',
      artifact_type: input.artifact_type || 'hash-record',
      name: input.name || 'AIFT Forge Hash Record',
      location: input.location || 'inline',
      sha256: hash,
      signing_status: 'pending',
      hash_status: 'recorded',
      created_at: now()
    });
  }
  return writeState({ ...state, artifacts: nextArtifacts });
}

export function exportReleaseManifest(input = {}) {
  const state = readState();
  const artifacts = Array.isArray(state.artifacts) ? state.artifacts : [];
  const releaseManifests = Array.isArray(state.release_manifests) ? state.release_manifests : [];
  const manifest = {
    schema: 'aift.release.export.v1',
    product: 'aift-forge',
    repo_id: input.repo_id || 'aift-root',
    version: input.version || '0.1.0',
    channel: input.channel || 'alpha',
    source_ref: input.source_ref || 'main',
    artifact_count: artifacts.length,
    artifacts: artifacts.map((artifact) => ({
      artifact_id: artifact.artifact_id,
      name: artifact.name,
      artifact_type: artifact.artifact_type,
      sha256: artifact.sha256,
      signing_status: artifact.signing_status
    })),
    approval_status: 'pending',
    exported_at: now()
  };
  const manifestRecord = {
    manifest_id: `manifest-export-${Date.now()}`,
    ...manifest,
    created_at: now()
  };
  return writeState({ ...state, release_manifests: [manifestRecord, ...releaseManifests] });
}
