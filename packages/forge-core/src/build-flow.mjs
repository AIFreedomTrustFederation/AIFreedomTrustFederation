import { writeState, readState, makeId } from './store.mjs';
import { now } from './seed.mjs';
import { hashText } from './artifact-hash.mjs';

export function composeBuildFlow(input = {}) {
  const state = readState();
  const timestamp = now();
  const version = input.version || '0.1.0';
  const channel = input.channel || 'alpha';
  const target = input.target || 'web-bundle';
  const buildId = makeId('build');
  const packageId = makeId('pkg');
  const artifactId = makeId('artifact');
  const hash = hashText(`${target}:${version}:${timestamp}`);

  const build = {
    build_id: buildId,
    repo_id: input.repo_id || 'aift-root',
    source_ref: input.source_ref || 'main',
    runner_node_id: input.runner_node_id || 'local-builder',
    status: 'queued',
    target,
    created_at: timestamp
  };

  const pkg = {
    package_id: packageId,
    repo_id: input.repo_id || 'aift-root',
    name: input.package_name || 'AIFT Forge Build Package',
    package_type: input.package_type || 'web-bundle',
    version,
    channel,
    hash_status: 'recorded',
    created_at: timestamp
  };

  const artifact = {
    artifact_id: artifactId,
    repo_id: input.repo_id || 'aift-root',
    package_id: packageId,
    artifact_type: input.artifact_type || 'package-output',
    name: input.artifact_name || 'AIFT Forge Build Artifact',
    location: input.location || 'pending',
    sha256: hash,
    signing_status: 'pending',
    hash_status: 'recorded',
    created_at: timestamp
  };

  const manifest = {
    manifest_id: makeId('manifest'),
    schema: 'aift.release.export.v1',
    repo_id: input.repo_id || 'aift-root',
    release_id: input.release_id || 'pending',
    version,
    channel,
    source_ref: input.source_ref || 'main',
    artifact_count: 1,
    approval_status: 'pending',
    created_at: timestamp
  };

  const approval = {
    approval_id: makeId('approval'),
    scope: 'release',
    scope_id: manifest.manifest_id,
    decision: 'pending',
    reason: 'Synchronized build flow requires human release approval.',
    created_at: timestamp
  };

  return writeState({
    ...state,
    builds: [build, ...(state.builds || [])],
    packages: [pkg, ...(state.packages || [])],
    artifacts: [artifact, ...(state.artifacts || [])],
    release_manifests: [manifest, ...(state.release_manifests || [])],
    approvals: [approval, ...(state.approvals || [])]
  });
}
