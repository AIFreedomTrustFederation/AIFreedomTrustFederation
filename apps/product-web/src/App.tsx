import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AI Freedom Trust Federation</p>
        <h1>AIFT Cloud</h1>
        <p className="lede">Installable sovereign cloud dashboard for local nodes, VPS relays, APK provider nodes, repo mirrors, and human-governed automation.</p>
        <div className="actions">
          <a href="http://127.0.0.1:3001/node-status">Open Local Node</a>
          <a href="http://127.0.0.1:3001/aift-repos">Open Repo Registry</a>
        </div>
      </section>

      <section className="grid">
        <article><h2>Local-first</h2><p>The app can open a local AIFT node dashboard when the node runtime is active.</p></article>
        <article><h2>Relay-ready</h2><p>AFTP VPS relays coordinate nodes without replacing local ownership.</p></article>
        <article><h2>APK path</h2><p>The same product shell can be wrapped for Android using Capacitor.</p></article>
        <article><h2>Windows path</h2><p>The desktop shell can be packaged as a Windows installer or portable app.</p></article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
