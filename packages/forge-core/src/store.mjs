import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSeedState, now } from './seed.mjs';

const DEFAULT_HOME = path.join(os.homedir(), '.aift-forge');

export function forgeHome() {
  return process.env.AIFT_FORGE_HOME || DEFAULT_HOME;
}

export function forgeStorePath() {
  return process.env.AIFT_FORGE_STORE || path.join(forgeHome(), 'forge-state.json');
}

export function ensureStore() {
  const storePath = forgeStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  if (!fs.existsSync(storePath)) writeState(createSeedState());
  return storePath;
}

export function readState() {
  const storePath = ensureStore();
  return JSON.parse(fs.readFileSync(storePath, 'utf8'));
}

export function writeState(state) {
  const storePath = forgeStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const next = { ...state, updated_at: now() };
  fs.writeFileSync(storePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export function resetState() {
  return writeState(createSeedState());
}

export function addRecord(collection, record) {
  const state = readState();
  if (!Array.isArray(state[collection])) throw new Error(`Unknown collection: ${collection}`);
  return writeState({ ...state, [collection]: [record, ...state[collection]] });
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}`;
}

export function nextNumber(records) {
  return records.reduce((max, item) => Math.max(max, item.number || 0), 0) + 1;
}
