import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { checkForgeApi, fetchForgeState, FORGE_API_URL, postForgeAction, type ForgeApiStatus } from './forge/api';
import { createArtifactRecord, createReleaseManifestRecord } from './forge/package-store';
import {
  createAiRequest,
  createIssue,
  createPullRequest,
  draftRelease,
  loadForgeState,
  publishPackageRecord,
  queueBuild,
  requestApproval,
  resetForgeState,
  saveForgeState,
} from './forge/store';
import type { ForgeState } from './forge/types';

const tabs = ['Code', 'AI', 'Issues', 'Pull Requests', 'Builds', 'Packages', 'Artifacts', 'Release Manifests', 'Approvals', 'Security Review', 'Build Doctor'];
const files = [
  ['apps/forge-api/server.mjs', 'Local Forge API with records, build flow, Android build requests, APK download routes, and Git routes', 'active'],
  ['apps/android/capacitor.config.ts', 'Android app configuration with local-network fallbacks', 'active'],
  ['apps/android/src/main.ts', 'Android local-first shell UI', 'active'],
  ['apps/android/scripts/collect-apk.mjs', 'Repo-local APK collector', 'active'],
  ['packages/forge-core/src/android-build.mjs', 'One-click Android APK build request record', 'active'],
  ['packages/forge-core/src/build-flow.mjs', 'Synchronized build/package/artifact/approval flow', 'active'],
];
const agents = ['repo-assistant', 'code-review-assistant', 'issue-triage-assistant', 'build-failure-assistant', 'release-assistant', 'security-assistant', 'docs-assistant', 'node-federation-assistant'];

function anchorFor(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

function App() {
  const [state, setState] = React.useState<ForgeState>(() => loadForgeState());
  const [apiStatus, setApiStatus] = React.useState<ForgeApiStatus>('checking');
  const [notice, setNotice] = React.useState('Ready.');

  function apply(next: ForgeState, message = 'State updated.') {
    saveForgeState(next);
    setState(next);
    setNotice(message);
  }

  async function refreshFromApi() {
    const online = await checkForgeApi();
    setApiStatus(online ? 'online' : 'offline');
    if (!online) {
      setNotice('Backend offline. Browser fallback is active.');
      return;
    }
    apply(await fetchForgeState(), 'Backend state refreshed.');
  }

  React.useEffect(() => {
    refreshFromApi().catch(() => setApiStatus('offline'));
  }, []);

  async function backendFirst(action: string, fallback: () => ForgeState, body: Record<string, unknown> = {}, message = 'Action complete.') {
    if (apiStatus !== 'offline') {
      try {
        const next = await postForgeAction(action, body);
        setApiStatus('online');
        apply(next, message);
        return;
      } catch {
        setApiStatus('offline');
      }
    }
    apply(fallback(), `${message} Used browser fallback.`);
  }

  function planned(feature: string) {
    apply(requestApproval(state, 'ai-action'), `${feature} is planned. An approval/implementation record was created.`);
  }

  const artifacts = state.artifacts || [];
  const manifests = state.release_manifests || [];
  const snapshots = (state as ForgeState & { git_snapshots?: unknown[] }).git_snapshots || [];
  const androidBuilds = (state as ForgeState & { android_builds?: unknown[] }).android_builds || [];
  const androidDownloadUrl = `${FORGE_API_URL}/downloads/android/aift-forge-debug.apk`;
  const androidArtifactsUrl = `${FORGE_API_URL}/api/android/artifacts`;
  const stats = [
    ['Repos', state.repos.length],
    ['Issues', state.issues.length],
    ['Pull Requests', state.pull_requests.length],
    ['Builds', state.builds.length],
    ['Android Builds', androidBuilds.length],
    ['Packages', state.packages.length],
    ['Artifacts', artifacts.length],
    ['Release Manifests', manifests.length],
    ['Approvals', state.approvals.length],
    ['AI Requests', state.ai_requests.length],
    ['Git Snapshots', snapshots.length],
  ];

  return (
    <div className="app-shell" id="top">
      <header className="topbar">
        <a className="brand" href="#top"><span className="mark">A</span>AIFT Forge</a>
        <label className="search"><span>Search</span><input placeholder="Search is planned; records are live." onChange={(event) => setNotice(`Search planned for: ${event.target.value}`)} /></label>
        <nav className="global-nav">{tabs.map((tab) => <a href={`#${anchorFor(tab)}`} key={tab}>{tab}</a>)}</nav>
        <div className="top-actions"><button onClick={() => backendFirst('issue', () => createIssue(state), {}, 'Issue created.')}>+</button><button onClick={() => backendFirst('ai_request', () => createAiRequest(state), {}, 'AI request created.')}>AI</button><button onClick={() => planned('Notifications')}>Notify</button><button onClick={refreshFromApi}>Node</button></div>
      </header>

      <main className="shell">
        <section className="repo-hero" id="code">
          <div><p className="eyebrow">AI Freedom Trust Federation / <strong>AIFT Forge</strong></p><h1>AIFreedomTrustFederation</h1><p className="lede">Sovereign repo hosting, issues, pull requests, packages, artifacts, build flows, Android APK packaging, AI agents, and disk-backed Git foundations.</p><div className="topic-row"><span>local-first</span><span>backend-first</span><span>Git-backed</span><span>AI-assisted</span><span>APK-ready</span></div></div>
          <div className="repo-actions"><button onClick={() => planned('Watch')}>Watch planned</button><button onClick={() => planned('Star')}>Star planned</button><button onClick={() => backendFirst('ai_request', () => createAiRequest(state, 'code-review-assistant'), { agent: 'code-review-assistant' }, 'AI review created.')}>AI Review</button><button onClick={() => planned('Mirror')}>Mirror planned</button><button onClick={() => planned('Fork')}>Fork planned</button><button className="primary" onClick={() => backendFirst('git_init', () => requestApproval(state), { slug: 'aift-root', name: 'aift-root' }, 'Git repository initialized or recorded.')}>Init Git</button></div>
        </section>

        <section className="stats-grid">{stats.map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>
        <p className="notice">{notice} Backend API: <strong>{apiStatus}</strong></p>
        <nav className="repo-tabs">{tabs.map((tab, index) => <a className={index === 0 ? 'active' : ''} href={`#${anchorFor(tab)}`} key={tab}>{tab}</a>)}</nav>

        <section className="repo-layout">
          <div className="repo-main">
            <div className="toolbar-card"><button onClick={() => planned('Branch viewer')}>Branches planned</button><button onClick={() => planned('Tag viewer')}>Tags planned</button><button onClick={() => planned('Commit history viewer')}>History planned</button><button onClick={() => backendFirst('ai_request', () => createAiRequest(state, 'repo-assistant'), { agent: 'repo-assistant' }, 'Repo AI request created.')}>Ask AI</button><button onClick={() => backendFirst('reset', () => resetForgeState(), {}, 'Data reset.')}>Reset Data</button><button onClick={refreshFromApi}>Refresh API</button><button className="primary" onClick={() => backendFirst('build_flow', () => queueBuild(state), { target: 'web-bundle', version: '0.1.0' }, 'Synchronized build flow created.')}>Run Build Flow</button></div>
            <section className="readme-card"><p className="eyebrow">Android One-Click</p><h2>Build Android APK</h2><p>Click once to create a repo-local Android APK build request. When the local builder produces the APK and the collector runs, the install file is served from the Forge API.</p><div className="quick-grid"><button className="primary" onClick={() => backendFirst('android_build', () => requestApproval(state), { target: 'debug-apk' }, 'Android APK build request created. When the APK exists, use the download link.')}>Build Android APK</button><a className="button-like" href={androidDownloadUrl}>Download Debug APK</a><a className="button-like secondary" href={androidArtifactsUrl}>View APK Manifest</a></div><p className="notice">Expected repo artifact: dist/android/aift-forge-debug.apk</p></section>
            <div className="file-card">{files.map(([name, message, status]) => <div className="file-row" key={name}><strong>{name}</strong><span>{message}</span><em>{status}</em></div>)}</div>
            <section className="readme-card" id="ai"><p className="eyebrow">AI Integration</p><h2>ChatGPT-compatible and local AI assistants</h2><p>AIFT Forge supports provider-neutral AI: OpenAI-compatible APIs, local models, private relay models, offline rules, and future AIFT-native agents.</p><div className="quick-grid">{agents.map((agent) => <button key={agent} onClick={() => backendFirst('ai_request', () => createAiRequest(state, agent), { agent }, `${agent} created.`)}>{agent}</button>)}</div></section>
            <section className="readme-card"><h2>Working Actions</h2><div className="quick-grid"><button onClick={() => backendFirst('issue', () => createIssue(state), {}, 'Issue created.')}>New Issue</button><button onClick={() => backendFirst('pull_request', () => createPullRequest(state), {}, 'Pull request created.')}>New Pull Request</button><button onClick={() => backendFirst('release', () => draftRelease(state), {}, 'Release drafted.')}>Draft Release</button><button onClick={() => backendFirst('package', () => publishPackageRecord(state), {}, 'Package created.')}>Publish Package</button><button onClick={() => backendFirst('artifact', () => createArtifactRecord(state), {}, 'Artifact recorded.')}>Record Artifact</button><button onClick={() => backendFirst('release_manifest', () => createReleaseManifestRecord(state), {}, 'Release manifest created.')}>Release Manifest</button><button onClick={() => backendFirst('approval', () => requestApproval(state), {}, 'Approval requested.')}>Request Approval</button></div></section>
            <section className="readme-card" id="security-review"><p className="eyebrow">Security Review</p><h2>Risk checks stay in the product loop</h2><p>Security Review tracks repo permissions, approval coverage, artifact integrity, and release blockers before packages move forward.</p><div className="quick-grid"><button onClick={() => backendFirst('ai_request', () => createAiRequest(state, 'security-assistant'), { agent: 'security-assistant' }, 'Security review created.')}>Run Security Review</button><button onClick={() => planned('Policy exceptions')}>Policy Exceptions</button><button onClick={() => planned('Secret audit')}>Secret Audit</button></div></section>
            <section className="readme-card" id="build-doctor"><p className="eyebrow">Build Doctor</p><h2>Build diagnosis should be one click away</h2><p>Build Doctor is the operator surface for failed build triage, artifact checks, packaging drift, and next repair actions across web, desktop, and Android outputs.</p><div className="quick-grid"><button onClick={() => backendFirst('ai_request', () => createAiRequest(state, 'build-failure-assistant'), { agent: 'build-failure-assistant' }, 'Build doctor request created.')}>Open Build Doctor</button><button onClick={() => backendFirst('build_flow', () => queueBuild(state), { target: 'android-apk', version: '0.1.0' }, 'Android build flow created.')}>Retry Android Build</button><button onClick={() => planned('Packaging diff')}>Packaging Diff</button></div></section>
            <section className="module-grid data-grid">
              <article id="issues"><h3>Issues</h3>{state.issues.slice(0, 3).map((issue) => <p key={issue.issue_id}>#{issue.number} {issue.title} | {issue.status}</p>)}</article>
              <article id="pull-requests"><h3>Pull Requests</h3>{state.pull_requests.slice(0, 3).map((pr) => <p key={pr.pr_id}>#{pr.number} {pr.title} | {pr.review_status}</p>)}</article>
              <article id="builds"><h3>Builds</h3>{state.builds.slice(0, 3).map((build) => <p key={build.build_id}>{build.target} | {build.status}</p>)}</article>
              <article id="packages"><h3>Packages</h3>{state.packages.slice(0, 3).map((pkg) => <p key={pkg.package_id}>{pkg.name} | {pkg.hash_status}</p>)}</article>
              <article id="artifacts"><h3>Artifacts</h3>{artifacts.slice(0, 3).map((artifact) => <p key={artifact.artifact_id}>{artifact.name} | {artifact.signing_status}</p>)}</article>
              <article id="release-manifests"><h3>Release Manifests</h3>{manifests.slice(0, 3).map((manifest) => <p key={manifest.manifest_id}>{manifest.version} | {manifest.approval_status}</p>)}</article>
              <article id="approvals"><h3>Approvals</h3>{state.approvals.slice(0, 3).map((approval) => <p key={approval.approval_id}>{approval.scope} | {approval.decision}</p>)}</article>
            </section>
          </div>

          <aside className="repo-sidebar"><article className="side-card status-card" id="backend-api"><h3>Backend API</h3><p>Status: <strong>{apiStatus}</strong></p><p>{apiStatus === 'online' ? 'Backend-backed records are active.' : 'Offline fallback uses browser-local records.'}</p><button className="wide" onClick={refreshFromApi}>Refresh API State</button></article><article className="side-card"><h3>Android APK</h3><p>One-click build requests create an Android build record. APK download is available after the repo-local APK collector finds a built APK.</p><button className="wide" onClick={() => backendFirst('android_build', () => requestApproval(state), { target: 'debug-apk' }, 'Android APK build request created.')}>Build Android APK</button><a className="wide button-like" href={androidDownloadUrl}>Download APK</a><a className="wide button-like secondary" href={androidArtifactsUrl}>APK Manifest</a></article><article className="side-card"><h3>Package Pipeline</h3><p>Build flows create build, package, artifact, hash, manifest, and approval records together.</p><button className="wide" onClick={() => backendFirst('build_flow', () => queueBuild(state), {}, 'Build flow created.')}>Run Synchronized Build</button><button className="wide secondary" onClick={() => backendFirst('git_inspect', () => requestApproval(state), { slug: 'aift-root' }, 'Git repo inspected.')}>Inspect Git Repo</button></article><article className="side-card"><h3>Clone</h3><div className="clone-box">aift clone aift-root</div><button className="wide" onClick={() => setNotice('Clone command: aift clone aift-root')}>Show Clone Command</button><button className="wide secondary" onClick={() => planned('Archive export')}>Download Archive planned</button><button className="wide secondary" onClick={() => planned('Desktop deep link')}>Open in Desktop planned</button></article></aside>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
