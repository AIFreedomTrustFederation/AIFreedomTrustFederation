import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const navItems = ['Explore', 'Repositories', 'Issues', 'Pull Requests', 'Builds', 'Packages', 'Releases', 'Nodes'];
const repoTabs = ['Code', 'Issues', 'Pull Requests', 'Actions', 'Builds', 'Packages', 'Releases', 'Projects', 'Wiki', 'Security', 'Insights', 'Settings', 'Mirrors', 'Nodes', 'Approvals'];
const files = [
  ['apps/', 'Installable product apps', 'updated now'],
  ['docs/', 'Forge requirements and system doctrine', 'updated now'],
  ['aift-forge-manifest.json', 'Product manifest', 'foundation'],
  ['aift-root-manifest.json', 'Root identity manifest', 'active'],
  ['README.md', 'Public doctrine root', 'active'],
];
const rightCards = [
  ['About', 'Installable, self-hosted, federated GitHub alternative for AIFT repositories, releases, packages, issues, builds, and node mirrors.'],
  ['Release channel', 'alpha · Windows · Android · Web · VPS relay'],
  ['Node status', 'local-first · relay-assisted · mirror-ready'],
  ['Security', 'hash pending · signing planned · approvals required'],
];

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="mark">A</span>AIFT Forge</a>
        <label className="search"><span>Search</span><input placeholder="Search or jump to..." /></label>
        <nav className="global-nav">{navItems.map((item) => <a href={`#${item.toLowerCase().replaceAll(' ', '-')}`} key={item}>{item}</a>)}</nav>
        <div className="top-actions"><button>+</button><button>🔔</button><button>Node</button></div>
      </header>

      <main className="shell">
        <section className="repo-hero">
          <div>
            <p className="eyebrow">AI Freedom Trust Federation / <strong>AIFT Forge</strong></p>
            <h1>AIFreedomTrustFederation</h1>
            <p className="lede">Sovereign repo hosting, issues, pull requests, releases, packages, builds, mirrors, and node federation.</p>
            <div className="topic-row"><span>local-first</span><span>vps-relay</span><span>apk-ready</span><span>windows-app</span><span>federated-repos</span></div>
          </div>
          <div className="repo-actions">
            <button>Watch</button><button>Star</button><button>Mirror</button><button>Fork</button><button className="primary">Clone</button>
          </div>
        </section>

        <nav className="repo-tabs">{repoTabs.map((tab, index) => <a className={index === 0 ? 'active' : ''} href={`#${tab.toLowerCase().replaceAll(' ', '-')}`} key={tab}>{tab}</a>)}</nav>

        <section className="repo-layout">
          <div className="repo-main">
            <div className="toolbar-card">
              <div className="branch-select">main ▾</div>
              <button>Go to file</button>
              <button>Add file ▾</button>
              <button>Compare</button>
              <button>History</button>
              <button className="primary">Code ▾</button>
            </div>

            <div className="file-card">
              <div className="commit-row"><strong>Owner Orchestrator</strong><span>seed AIFT Forge product root</span><em>latest</em></div>
              {files.map(([name, message, status]) => (
                <div className="file-row" key={name}><strong>{name}</strong><span>{message}</span><em>{status}</em></div>
              ))}
            </div>

            <section className="readme-card">
              <h2>README</h2>
              <p>AIFT Forge is the installable product layer for a self-hosted GitHub alternative. GitHub remains a public mirror; AIFT-operated relays and nodes become the runtime source of truth.</p>
              <div className="quick-grid">
                <button>New Issue</button><button>New Pull Request</button><button>Draft Release</button><button>Publish Package</button><button>Queue Build</button><button>Add Mirror</button><button>Open Node</button><button>Request Approval</button>
              </div>
            </section>

            <section className="module-grid">
              <article><h3>Issues</h3><p>Labels, milestones, assignees, templates, linked PRs, comments, close/reopen.</p><button>Open Issues</button></article>
              <article><h3>Pull Requests</h3><p>Branch compare, reviews, file comments, checks, approvals, merge policies.</p><button>Open PRs</button></article>
              <article><h3>Builds</h3><p>Runner node, logs, artifacts, queued/running/passed/failed status.</p><button>Open Builds</button></article>
              <article><h3>Releases</h3><p>APK, Windows installer, portable desktop, source archive, hashes, signing status.</p><button>Open Releases</button></article>
              <article><h3>Packages</h3><p>Node bundles, app templates, source archives, channels, mirrors.</p><button>Open Packages</button></article>
              <article><h3>Federation</h3><p>Owner node, mirror nodes, relay nodes, replication status, conflict records.</p><button>Open Nodes</button></article>
            </section>
          </div>

          <aside className="repo-sidebar">
            {rightCards.map(([title, body]) => <article className="side-card" key={title}><h3>{title}</h3><p>{body}</p></article>)}
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
