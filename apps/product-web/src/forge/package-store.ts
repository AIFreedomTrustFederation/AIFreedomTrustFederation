import type { ForgeArtifact, ForgeReleaseManifest, ForgeState } from './types';

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function createArtifactRecord(state: ForgeState): ForgeState {
  const artifact: ForgeArtifact = {
    artifact_id: id('artifact'),
    repo_id: 'aift-root',
    package_id: 'pending',
    artifact_type: 'package-output',
    name: 'AIFT Forge Local Artifact Record',
    location: 'pending',
    sha256: 'pending',
    signing_status: 'pending',
    created_at: now(),
  };
  return { ...state, artifacts: [artifact, ...(state.artifacts || [])] };
}

export function createReleaseManifestRecord(state: ForgeState): ForgeState {
  const manifest: ForgeReleaseManifest = {
    manifest_id: id('manifest'),
    schema: 'aift.release.manifest.record.v1',
    repo_id: 'aift-root',
    release_id: 'pending',
    version: '0.1.0',
    channel: 'alpha',
    source_ref: 'main',
    artifact_count: state.artifacts?.length || 0,
    approval_status: 'pending',
    created_at: now(),
  };
  return { ...state, release_manifests: [manifest, ...(state.release_manifests || [])] };
}
