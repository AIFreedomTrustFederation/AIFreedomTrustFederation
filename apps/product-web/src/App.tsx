import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
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

const navItems = ['Explore', 'Repositories', 'Issues', 'Pull Requests', 'Builds', 'Packages', 'Releases', 'AI', 'Nodes'];
const repoTabs = ['Code', 'AI', 'Issues', 'Pull Requests', 'Actions', 'Builds', 'Packages', 'Releases', 'Projects', 'Wiki', 'Security', 'Insights', 'Settings', 'Mirrors', 'Nodes', 'Approvals'];
const files = [
  ['apps/', 'Installable product apps', 'updated now'],
  ['docs/', 'Forge requirements, AI layer, and system doctrine', 'updated now'],
  ['apps/product-web/src/forge/', 'Local Forge data model and store', 'active'],
  ['aift-ai-manifest.json', 'AI provider and agent manifest', 'foundation'],
  ['aift-forge-manifest.json', 'Product manifest', 'foundation'],
  ['aift-root-manifest.json', 'Root identity manifest', 'active'],
  ['README.md', 'Public doctrine root', 'active'],
];
const rightCards = [
  ['About', 'Installable, self-hosted, federated GitHub alternative for AIFT repositories, releases, packages, issues, builds, and node mirrors.'],
  ['AI providers', 'OpenAI-compatible · local model · private relay · offline rules · AIFT-native'],
  ['Release channel', 'alpha · Windows · Android · Web · VPS relay'],
  ['Node status', 'local-first · relay-assisted · mirror-ready'],
  ['Security', 'no secrets in repo · approvals required · signing planned'],
];
const aiAgents = [
  ['Repo Assistant', 'Summarize repo purpose, explain files, detect framework, and suggest next steps.', 'repo-assistant'],
  ['Code Review', 'Summarize diffs, identify risk, suggest comments, and prepare approval drafts.', 'code-review-assistant'],
  ['Issue Triage', 'Classify issues, suggest labels, find duplicates, and draft responses.', 'issue-triage-assistant'],
  ['Build Doctor', 'Read build logs, identify first failure, classify cause, and recommend fixes.', 'build-failure-assistant'],
  ['Release Notes', 'Summarize commits, collect artifacts, and draft changelogs.', 'release-assistant'],
  ['Security Review', 'Scan for secrets, risky dependencies, unsafe permissions, and misleading claims.', 'security-assistant'],
  ['Docs Assistant', 'Generate README sections, architecture notes, API docs, and troubleshooting guides.', 'docs-assistant'],
  ['Node Federation AI', 'Summarize node health, mirrors, stale nodes, and safe fallback routes.', 'node-federation-assistant'],
];

function anchorFor(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

function App() {
  const [state, setState] = React.useState<ForgeState>(() => loadForgeState());

  function apply(next: ForgeState) {
    saveForgeState(next);
    setState(next);
  }

  const stats = [
    ['Repos', state.repos.length],
    ['Issues', state.issues.length],
    ['Pull Requests', state.pull_requests.length],
    ['Builds', state.builds.length],
    ['Packages', state.packages.length],
    ['Releases', state.releases.length],
    ['Approvals', state.approvals.length],
    ['AI Requests', state.ai_requests.length],
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="mark">A</span>AIFT Forge</a>
        <label className="search"><span>Search</span><input placeholder="Search repos, issues, code, builds, AI..." /></label>
        <nav className="global-nav">{navItems.map((item) => <a href={`#${anchorFor(item)}`} key={item}>{item}</a>)}</nav>
        <div className="top-actions"><button onClick={() => apply(createIssue(state))}>+</button><button onClick={() => apply(createAiRequest(state))}>AI</button><button>🔔</button><button>Node</button></div>
      </header>

      <main className="shell">
        <section className="repo-hero">
          <div>
            <p className="eyebrow">AI Freedom Trust Federation / <strong>AIFT Forge</strong></p>
            <h1>AIFreedomTrustFederation</h1>
            <p className="lede">Sovereign repo hosting, issues, pull requests, releases, packages, builds, AI agents, mirrors, and node federation.</p>
            <div className="topic-row"><span>local-first</span><span>AI-assisted</span><span>vps-relay</span><span>apk-ready</span><span>windows-app</span><span>federated-repos</span></div>
          </div>
          <div className="repo-actions">
            <button>Watch</button><button>Star</button><button onClick={() => apply(createAiRequest(state, 'code-review-assistant'))}>AI Review</button><button>Mirror</button><button>Fork</button><button className="primary">Clone</button>
          </div>
        </section>

        <section className="stats-grid">
          {stats.map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
        </section>

        <nav className="repo-tabs">{repoTabs.map((tab, index) => <a className={index === 0 ? 'active' : ''} href={`#${anchorFor(tab)}`} key={tab}>{tab}</a>)}</nav>

        <section className="repo-layout">
          <div className="repo-main">
            <div className="toolbar-card">
              <div className="branch-select">main ▾</div>
              <button>Go to file</button>
              <button>Add file ▾</button>
              <button>Compare</button>
              <button>History</button>
              <button onClick={() => apply(createAiRequest(state, 'repo-assistant'))}>Ask AI</button>
              <button onClick={() => apply(resetForgeState())}>Reset Local Data</button>
              <button className="primary">Code ▾</button>
            </div>

            <div className="file-card">
              <div className="commit-row"><strong>Owner Orchestrator</strong><span>wire AIFT Forge UI to local data records</span><em>latest</em></div>
              {files.map(([name, message, status]) => (
                <div className="file-row" key={name}><strong>{name}</strong><span>{message}</span><em>{status}</em></div>
              ))}
            </div>

            <section className="readme-card ai-panel" id="ai">
              <div>
                <p className="eyebrow">AI Integration</p>
                <h2>ChatGPT-compatible and local AI assistants</h2>
                <p>AIFT Forge supports a provider-neutral AI layer: OpenAI-compatible APIs, local models, private relay models, offline rules, and future AIFT-native agents. Secrets stay outside the repo and high-risk actions require human approval.</p>
              </div>
              <div className="quick-grid">
                <button>Configure Provider</button><button onClick={() => apply(createAiRequest(state, 'repo-assistant'))}>Ask Repo AI</button><button onClick={() => apply(createAiRequest(state, 'code-review-assistant'))}>Review PR</button><button onClick={() => apply(createAiRequest(state, 'issue-triage-assistant'))}>Triage Issue</button><button onClick={() => apply(createAiRequest(state, 'build-failure-assistant'))}>Diagnose Build</button><button onClick={() => apply(createAiRequest(state, 'release-assistant'))}>Draft Release Notes</button><button onClick={() => apply(createAiRequest(state, 'security-assistant'))}>Security Review</button><button onClick={() => apply(createAiRequest(state, 'node-federation-assistant'))}>Operator Report</button>
              </div>
            </section>

            <section className="readme-card">
              <h2>README</h2>
              <p>AIFT Forge is the installable product layer for a self-hosted GitHub alternative. GitHub remains a public mirror; AIFT-operated relays and nodes become the runtime source of truth.</p>
              <div className="quick-grid">
                <button onClick={() => apply(createIssue(state))}>New Issue</button><button onClick={() => apply(createPullRequest(state))}>New Pull Request</button><button onClick={() => apply(draftRelease(state))}>Draft Release</button><button onClick={() => apply(publishPackageRecord(state))}>Publish Package</button><button onClick={() => apply(queueBuild(state))}>Queue Build</button><button>Add Mirror</button><button>Open Node</button><button onClick={() => apply(requestApproval(state))}>Request Approval</button>
              </div>
            </section>

            <section className="module-grid ai-grid">
              {aiAgents.map(([title, body, agent]) => <article key={title}><h3>{title}</h3><p>{body}</p><button onClick={() => apply(createAiRequest(state, agent))}>{title}</button></article>)}
            </section>

            <section className="module-grid data-grid">
              <article id="issues"><h3>Latest Issues</h3>{state.issues.slice(0, 3).map((issue) => <p key={issue.issue_id}>#{issue.number} {issue.title} · {issue.status}</p>)}<button onClick={() => apply(createIssue(state))}>Create Issue</button></article>
              <article id="pull-requests"><h3>Pull Requests</h3>{state.pull_requests.slice(0, 3).map((pr) => <p key={pr.pr_id}>#{pr.number} {pr.title} · {pr.review_status}</p>)}<button onClick={() => apply(createPullRequest(state))}>Create PR</button></article>
              <article id="builds"><h3>Builds</h3>{state.builds.slice(0, 3).map((build) => <p key={build.build_id}>{build.target} · {build.status}</p>)}<button onClick={() => apply(queueBuild(state))}>Queue Build</button></article>
              <article id="releases"><h3>Releases</h3>{state.releases.slice(0, 3).map((release) => <p key={release.release_id}>{release.version} · {release.channel} · {release.status}</p>)}<button onClick={() => apply(draftRelease(state))}>Draft Release</button></article>
              <article id="packages"><h3>Packages</h3>{state.packages.slice(0, 3).map((pkg) => <p key={pkg.package_id}>{pkg.name} · {pkg.hash_status}</p>)}<button onClick={() => apply(publishPackageRecord(state))}>Add Package</button></article>
              <article id="approvals"><h3>Approvals</h3>{state.approvals.slice(0, 3).map((approval) => <p key={approval.approval_id}>{approval.scope} · {approval.decision}</p>)}<button onClick={() => apply(requestApproval(state))}>Request Approval</button></article>
              <article id="nodes"><h3>Nodes</h3>{state.nodes.slice(0, 3).map((node) => <p key={node.node_id}>{node.name} · {node.health}</p>)}<button onClick={() => apply(createAiRequest(state, 'node-federation-assistant'))}>Inspect Nodes</button></article>
              <article id="ai-requests"><h3>AI Requests</h3>{state.ai_requests.slice(0, 3).map((request) => <p key={request.ai_request_id}>{request.agent} · {request.status}</p>)}<button onClick={() => apply(createAiRequest(state))}>Run Local AI Stub</button></article>
            </section>
          </div>

          <aside className="repo-sidebar">
            {rightCards.map(([title, body]) => <article className="side-card" key={title}><h3>{title}</h3><p>{body}</p></article>)}
            <article className="side-card">
              <h3>Local Store</h3>
              <p>Browser-local records are active. This is the first functional Forge data layer.</p>
              <button className="wide" onClick={() => apply(createIssue(state))}>Create Local Issue</button>
              <button className="wide secondary" onClick={() => apply(createPullRequest(state))}>Create Local PR</button>
              <button className="wide secondary" onClick={() => apply(queueBuild(state))}>Queue Local Build</button>
            </article>
            <article className="side-card">
              <h3>AI Actions</h3>
              <button className="wide" onClick={() => apply(createAiRequest(state, 'repo-assistant'))}>Summarize Repo</button>
              <button className="wide secondary" onClick={() => apply(createAiRequest(state, 'code-review-assistant'))}>Review Changes</button>
              <button className="wide secondary" onClick={() => apply(createAiRequest(state, 'docs-assistant'))}>Draft Docs</button>
              <button className="wide secondary" onClick={() => apply(createAiRequest(state, 'security-assistant'))}>Security Scan</button>
            </article>
            <article className="side-card">
              <h3>Clone</h3>
              <div className="clone-box">aift clone aift-root</div>
              <button className="wide">Copy</button>
              <button className="wide secondary">Download Archive</button>
              <button className="wide secondary">Open in Desktop</button>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
