import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import './style.css';

const DEFAULT_LOCAL_API = 'http://127.0.0.1:4177';
const DEFAULT_NODE_DASHBOARD = 'http://127.0.0.1:3001/node-status';
const DEFAULT_RELAY = '';

async function pref(key: string, fallback: string) {
  const stored = await Preferences.get({ key });
  return stored.value || fallback;
}

async function setPref(key: string, value: string) {
  await Preferences.set({ key, value });
  render();
}

async function apiHealth(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/health`);
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` };
    return await response.json();
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'offline' };
  }
}

async function render() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  const [info, network, localApi, nodeDashboard, relayUrl] = await Promise.all([
    Device.getInfo(),
    Network.getStatus(),
    pref('aift.localApi', DEFAULT_LOCAL_API),
    pref('aift.nodeDashboard', DEFAULT_NODE_DASHBOARD),
    pref('aift.relayUrl', DEFAULT_RELAY)
  ]);
  const health = await apiHealth(localApi);
  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">AIFT Forge Android Alpha</p>
      <h1>Local-first repo node in your hand.</h1>
      <p class="lede">This Android shell is built to run with your local AIFT Forge API, local node dashboard, or optional relay. Nothing here requires a rate-limited cloud service.</p>
      <div class="status-grid">
        <article><span>Device</span><strong>${info.platform || 'android'}</strong></article>
        <article><span>Network</span><strong>${network.connected ? network.connectionType : 'offline'}</strong></article>
        <article><span>Forge API</span><strong>${health.ok ? 'online' : 'offline'}</strong></article>
        <article><span>Mode</span><strong>${relayUrl ? 'relay-ready' : 'local-only'}</strong></article>
      </div>
    </section>

    <section class="panel">
      <h2>Connection settings</h2>
      <label>Local Forge API<input id="localApi" value="${localApi}" /></label>
      <label>Node Dashboard<input id="nodeDashboard" value="${nodeDashboard}" /></label>
      <label>Optional Relay<input id="relayUrl" value="${relayUrl}" placeholder="https://your-aift-relay.example" /></label>
      <div class="actions">
        <button id="save">Save settings</button>
        <a href="${nodeDashboard}">Open node dashboard</a>
        <a href="${localApi}/api/health">Open API health</a>
      </div>
      <p class="note">Fallback order: bundled Android UI → local Forge API → local node dashboard → optional relay.</p>
    </section>

    <section class="panel">
      <h2>Android alpha checklist</h2>
      <ul>
        <li>Install as local Android shell.</li>
        <li>Store settings locally with Capacitor Preferences.</li>
        <li>Check network state with Capacitor Network.</li>
        <li>Check device platform with Capacitor Device.</li>
        <li>Keep working offline with bundled UI.</li>
      </ul>
    </section>
  `;
  document.querySelector<HTMLButtonElement>('#save')?.addEventListener('click', async () => {
    const nextLocalApi = (document.querySelector<HTMLInputElement>('#localApi')?.value || DEFAULT_LOCAL_API).trim();
    const nextNodeDashboard = (document.querySelector<HTMLInputElement>('#nodeDashboard')?.value || DEFAULT_NODE_DASHBOARD).trim();
    const nextRelayUrl = (document.querySelector<HTMLInputElement>('#relayUrl')?.value || '').trim();
    await setPref('aift.localApi', nextLocalApi);
    await setPref('aift.nodeDashboard', nextNodeDashboard);
    await setPref('aift.relayUrl', nextRelayUrl);
  });
}

App.addListener('appStateChange', () => render());
Network.addListener('networkStatusChange', () => render());
render();
