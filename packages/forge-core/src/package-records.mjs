import { addRecord, makeId, readState, writeState } from './store.mjs';
import { now } from './seed.mjs';

export function createPackage(input = {}) {
  return addRecord('packages', {
    package_id: makeId('pkg'),
    repo_id: input.repo_id || 'aift-root',
    name: input.name || 'AIFT Forge Package Record',
    package_type: input.package_type || 'web-bundle',
    version: input.version || '0.1.0',
    channel: input.channel || 'alpha',
    hash_status: 'pending',
    created_at: now()
  });
}

export function createArtifact(input = {}) {
  const state = readState();
  const artifacts = Array.isArray(state.artifacts) ? state.artifacts : [];
  return writeState({
    ...state,
    artifacts: [
      {
        artifact_id: makeId('artifact'),
        repo_id: input.repo_id || 'aift-root',
        package_id: input.package_id || 'pending',
        artifact_type: input.artifact_type || 'package-output',
        name: input.name || 'AIFT Forge Artifact Record',
        location: input.location || 'pending',
        sha256: input.sha256 || 'pending',
        signing_status: input.signing_status || 'pending',
        created_at: now()
      },
      ...artifacts
    ]
  });
}

export function createReleaseManifest(input = {}) {
  const state = readState();
  const releaseManifests = Array.isArray(state.release_manifests) ? state.release_manifests : [];
  return writeState({
    ...state,
    release_manifests: [
      {
        manifest_id: makeId('manifest'),
        schema: 'aift.release.manifest.record.v1',
        repo_id: input.repo_id || 'aift-root',
        release_id: input.release_id || 'pending',
        version: input.version || '0.1.0',
        channel: input.channel || 'alpha',
        source_ref: input.source_ref || 'main',
        artifact_count: Array.isArray(state.artifacts) ? state.artifacts.length : 0,
        approval_status: 'pending',
        created_at: now()
      },
      ...releaseManifests
    ]
  });
}
