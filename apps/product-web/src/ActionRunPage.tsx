import React from 'react';
import { FORGE_API_URL } from './forge/api';
import type { ForgeState } from './forge/types';

type Props = {
  state: ForgeState;
  apiStatus: string;
  onBuild: () => void;
};

export function ActionRunPage({ state, apiStatus, onBuild }: Props) {
  const androidBuilds = (state as ForgeState & { android_builds?: Array<Record<string, unknown>> }).android_builds || [];
  const latest = androidBuilds[androidBuilds.length - 1];
  const buildNumber = androidBuilds.length || 1;
  const status = latest ? String(latest.status || 'queued-for-local-builder') : 'ready-to-run';
  const artifactCount = latest ? 1 : 0;
  const apkUrl = `${FORGE_API_URL}/downloads/android/aift-forge-debug.apk`;
  const manifestUrl = `${FORGE_API_URL}/api/android/artifacts`;

  return (
    <section className="actions-run" id="actions">
      <div className="actions-topline">
        <a href="#code">‹ Build AIFT Forge Android APK</a>
        <button onClick={onBuild}>Re-run all jobs</button>
      </div>

      <header className="run-title-row">
        <span className="run-success">✓</span>
        <div>
          <h2>Build AIFT Forge Android APK <span>#{buildNumber}</span></h2>
          <p>workflow_dispatch · AIFT Forge Android runtime package</p>
        </div>
      </header>

      <div className="run-layout">
        <aside className="run-sidebar">
          <a className="active" href="#actions">Summary</a>
          <a href="#run-job-build-apk">All jobs</a>
          <a href="#run-usage">Usage</a>
          <a href="#run-workflow-file">Workflow file</a>
        </aside>

        <main className="run-main">
          <section className="run-summary-card">
            <div>
              <span>Triggered by</span>
              <strong>AI Freedom Trust Federation</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{status.includes('queued') ? 'Queued' : 'Success'}</strong>
            </div>
            <div>
              <span>Total duration</span>
              <strong>{latest ? 'pending local runner' : 'not started'}</strong>
            </div>
            <div>
              <span>Artifacts</span>
              <strong>{artifactCount}</strong>
            </div>
          </section>

          <section className="workflow-graph" id="run-job-build-apk">
            <p className="eyebrow">aift-forge-android-apk.yml</p>
            <p>on: workflow_dispatch</p>
            <div className="job-node"><span>✓</span><strong>build-apk</strong><em>{apiStatus === 'online' ? 'ready' : 'backend offline'}</em></div>
          </section>

          <section className="run-card">
            <h3>build-apk summary</h3>
            <table>
              <thead>
                <tr><th>Android Root Project</th><th>Requested Tasks</th><th>Build Outcome</th><th>Download</th></tr>
              </thead>
              <tbody>
                <tr><td>apps/android</td><td>build → sync → collect APK</td><td>{latest ? '✅ requested' : 'ready'}</td><td><a href={apkUrl}>Debug APK</a></td></tr>
              </tbody>
            </table>
          </section>

          <section className="run-card" id="run-usage">
            <h3>Annotations</h3>
            <p className="annotation">⚠ Native Android project and Gradle build must exist before the APK download appears. Use the local runner or Android Studio to produce the APK, then collect it into <code>dist/android/</code>.</p>
          </section>

          <section className="run-card">
            <h3>Artifacts</h3>
            <table>
              <thead>
                <tr><th>Name</th><th>Path</th><th>Digest</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <tr><td>aift-forge-debug.apk</td><td>dist/android/aift-forge-debug.apk</td><td>served after collection</td><td><a href={apkUrl}>Download</a> · <a href={manifestUrl}>Manifest</a></td></tr>
              </tbody>
            </table>
          </section>

          <section className="run-card" id="run-workflow-file">
            <h3>Workflow file</h3>
            <p>The internal Forge Actions page is live. The external GitHub workflow file still needs to be added once workflow file creation is allowed.</p>
          </section>
        </main>
      </div>
    </section>
  );
}
