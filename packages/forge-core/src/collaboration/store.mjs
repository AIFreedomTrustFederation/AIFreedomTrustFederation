import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function teamDir(paths) {
  return join(paths.repoRoot, ".forge", "teams");
}

export function teamRunDir(paths) {
  return join(paths.repoRoot, ".forge", "team-runs");
}

export function ensureTeamStore(paths) {
  mkdirSync(teamDir(paths), { recursive: true });
  mkdirSync(teamRunDir(paths), { recursive: true });
}

export function normalizeTeamId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function teamFile(paths, id) {
  return join(teamDir(paths), `${normalizeTeamId(id)}.json`);
}

export function teamRunFile(paths, id) {
  return join(teamRunDir(paths), `${normalizeTeamId(id)}.json`);
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function validateTeam(team) {
  if (!team.id) throw new Error("Team id is required.");
  if (!Array.isArray(team.members)) throw new Error("Team members must be an array.");
  if (team.members.length === 0) throw new Error("Team must have at least one member.");

  const ids = new Set();

  for (const [index, member] of team.members.entries()) {
    if (!member.agentId) throw new Error(`Team member ${index} is missing agentId.`);

    const key = member.id ?? member.agentId;
    if (ids.has(key)) throw new Error(`Duplicate team member id: ${key}`);
    ids.add(key);
  }

  return true;
}

export function createTeam(paths, team) {
  ensureTeamStore(paths);

  const id = normalizeTeamId(team.id ?? `team-${Date.now()}`);

  const next = {
    schema: "aift.forge.team.v1",
    id,
    title: team.title ?? id,
    description: team.description ?? "",
    enabled: team.enabled ?? true,
    strategy: team.strategy ?? "sequential",
    members: team.members ?? [],
    reviewerAgentId: team.reviewerAgentId ?? null,
    permissions: team.permissions ?? {
      filesystem: "read",
      git: "read",
      network: "local-only",
      write: "explicit-approval"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  validateTeam(next);
  writeJson(teamFile(paths, id), next);

  return next;
}

export function readTeam(paths, id) {
  ensureTeamStore(paths);

  const file = teamFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listTeams(paths) {
  ensureTeamStore(paths);

  return readdirSync(teamDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(teamDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function updateTeam(paths, id, patch) {
  const existing = readTeam(paths, id);
  if (!existing) throw new Error(`Team not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  validateTeam(next);
  writeJson(teamFile(paths, next.id), next);

  return next;
}

export function createTeamRun(paths, run) {
  ensureTeamStore(paths);

  const id = normalizeTeamId(run.id ?? `team-run-${Date.now()}`);

  const next = {
    schema: "aift.forge.team-run.v1",
    id,
    teamId: run.teamId,
    status: run.status ?? "running",
    prompt: run.prompt ?? "",
    strategy: run.strategy ?? "sequential",
    memberResults: run.memberResults ?? [],
    synthesis: run.synthesis ?? null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null
  };

  writeJson(teamRunFile(paths, id), next);
  return next;
}

export function readTeamRun(paths, id) {
  ensureTeamStore(paths);

  const file = teamRunFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listTeamRuns(paths) {
  ensureTeamStore(paths);

  return readdirSync(teamRunDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(teamRunDir(paths), file)))
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

export function updateTeamRun(paths, id, patch) {
  const existing = readTeamRun(paths, id);
  if (!existing) throw new Error(`Team run not found: ${id}`);

  const next = {
    ...existing,
    ...patch
  };

  writeJson(teamRunFile(paths, id), next);
  return next;
}

export function finishTeamRun(paths, id, patch = {}) {
  return updateTeamRun(paths, id, {
    ...patch,
    status: patch.status ?? "complete",
    finishedAt: new Date().toISOString()
  });
}
