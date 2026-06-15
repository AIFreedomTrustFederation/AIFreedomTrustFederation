import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const navItems = ['Explore', 'Repositories', 'Issues', 'Pull Requests', 'Builds', 'Packages', 'Releases', 'AI', 'Nodes'];
const repoTabs = ['Code', 'AI', 'Issues', 'Pull Requests', 'Actions', 'Builds', 'Packages', 'Releases', 'Projects', 'Wiki', 'Security', 'Insights', 'Settings', 'Mirrors', 'Nodes', 'Approvals'];
const files = [
  ['apps/', 'Installable product apps', 'updated now'],
  ['docs/', 'Forge requirements, AI layer, and system doctrine', 'updated now'],
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
  ['Repo Assistant', 'Summarize repo purpose, explain files, detect framework, and suggest next steps.', 'Ask repo AI'],
  ['Code Review', 'Summarize diffs, identify risk, suggest comments, and prepare approval drafts.', 'Review changes'],
  ['Issue Triage', 'Classify issues, suggest labels, find duplicates, and draft responses.', 'Triage issue'],
  ['Build Doctor', 'Read build logs, identify first failure, classify cause, and recommend fixes.', 'Diagnose build'],
  ['Release Notes', 'Summarize commits, collect artifacts, and draft changelogs.', 'Draft release'],
  ['Security Review', 'Scan for secrets, risky dependencies, unsafe permissions, and misleading claims.', 'Review security'],
  ['Docs Assistant', 'Generate README sections, architecture notes, API docs, and troubleshooting guides.', 'Draft docs'],
  ['Node Federation AI', 'Summarize node health, mirrors, stale nodes, and safe fallback routes.', 'Inspect nodes'],
];

function anchorFor(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="mark">A</span>AIFT Forge</a>
        <label className="search"><span>Search</span><input placeholder="Search repos, issues, code, builds, AI..." /></label>
        <nav className="global-nav">{navItems.map((item) => <a href={`#${anchorFor(item)}`} key={item}>{item}</a>)}</nav>
        <div className="top-actions"><button>+</button><button>AI</button><button>🔔</button><button>Node</button></div>
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
            <button>Watch</button><button>Star</button><button>AI Review</button><button>Mirror</button><button>Fork</button><button className="primary">Clone</button>
          </div>
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
              <button>Ask AI</button>
              <button className="primary">Code ▾</button>
            </div>

            <div className="file-card">
              <div className="commit-row"><strong>Owner Orchestrator</strong><span>add AIFT Forge AI integration layer</span><em>latest</em></div>
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
                <button>Configure Provider</button><button>Ask Repo AI</button><button>Review PR</button><button>Triage Issue</button><button>Diagnose Build</button><button>Draft Release Notes</button><button>Security Review</button><button>Operator Report</button>
              </div>
            </section>

            <section className="readme-card">
              <h2>README</h2>
              <p>AIFT Forge is the installable product layer for a self-hosted GitHub alternative. GitHub remains a public mirror; AIFT-operated relays and nodes become the runtime source of truth.</p>
              <div className="quick-grid">
                <button>New Issue</button><button>New Pull Request</button><button>Draft Release</button><button>Publish Package</button><button>Queue Build</button><button>Add Mirror</button><button>Open Node</button><button>Request Approval</button>
              </div>
            </section>

            <section className="module-grid ai-grid">
              {aiAgents.map(([title, body, action]) => <article key={title}><h3>{title}</h3><p>{body}</p><button>{action}</button></article>)}
            </section>

            <section className="module-grid">
              <article><h3>Issues</h3><p>Labels, milestones, assignees, templates, linked PRs, AI triage, comments, close/reopen.</p><button>Open Issues</button></article>
              <article><h3>Pull Requests</h3><p>Branch compare, AI review, file comments, checks, approvals, merge policies.</p><button>Open PRs</button></article>
              <article><h3>Builds</h3><p>Runner node, logs, AI diagnosis, artifacts, queued/running/passed/failed status.</p><button>Open Builds</button></article>
              <article><h3>Releases</h3><p>AI release notes, APK, Windows installer, source archive, hashes, signing status.</p><button>Open Releases</button></article>
              <article><h3>Packages</h3><p>Node bundles, app templates, source archives, channels, mirrors.</p><button>Open Packages</button></article>
              <article><h3>Federation</h3><p>Owner node, mirror nodes, relay nodes, AI operator report, conflict records.</p><button>Open Nodes</button></article>
            </section>
          </div>

          <aside className="repo-sidebar">
            {rightCards.map(([title, body]) => <article className="side-card" key={title}><h3>{title}</h3><p>{body}</p></article>)}
            <article className="side-card">
              <h3>AI Actions</h3>
              <button className="wide">Summarize Repo</button>
              <button className="wide secondary">Review Changes</button>
              <button className="wide secondary">Draft Docs</button>
              <button className="wide secondary">Security Scan</button>
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
