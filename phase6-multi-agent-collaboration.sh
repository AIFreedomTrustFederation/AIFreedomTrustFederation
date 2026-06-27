#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "👥 AIFT-Forge Phase 6: Multi-Agent Collaboration"

mkdir -p packages/forge-core/src/collaboration
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/teams
mkdir -p .forge/team-runs

cat > packages/forge-core/src/collaboration/store.mjs <<'JS'
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
JS

cat > packages/forge-core/src/collaboration/runtime.mjs <<'JS'
import { runAgent } from "../agents/runtime.mjs";
import {
  createTeamRun,
  finishTeamRun,
  readTeam,
  updateTeamRun
} from "./store.mjs";

export function buildMemberPrompt(member, teamPrompt, previousResults = []) {
  const role = member.role ?? "collaborator";
  const prior = previousResults.length === 0
    ? "No prior member responses yet."
    : previousResults
        .map((result) => `Agent ${result.agentId} (${result.role}):\n${result.text ?? result.error ?? ""}`)
        .join("\n\n");

  return [
    `You are acting as the ${role} in an AIFT-Forge local multi-agent team.`,
    "",
    "Team prompt:",
    teamPrompt,
    "",
    "Prior member responses:",
    prior,
    "",
    "Provide your contribution. Stay local-first, inspectable, and practical."
  ].join("\n");
}

export function buildSynthesisPrompt(team, teamPrompt, memberResults = []) {
  const body = memberResults
    .map((result) => [
      `Agent: ${result.agentId}`,
      `Role: ${result.role}`,
      `Status: ${result.ok ? "ok" : "failed"}`,
      "Contribution:",
      result.text ?? result.error ?? ""
    ].join("\n"))
    .join("\n\n---\n\n");

  return [
    "You are synthesizing a local AIFT-Forge multi-agent collaboration run.",
    "",
    `Team: ${team.title}`,
    "",
    "Original prompt:",
    teamPrompt,
    "",
    "Member contributions:",
    body,
    "",
    "Create a unified synthesis with decisions, risks, and next actions."
  ].join("\n");
}

export async function runTeam(paths, teamId, prompt, options = {}) {
  const team = readTeam(paths, teamId);

  if (!team) {
    return {
      ok: false,
      error: `Team not found: ${teamId}`
    };
  }

  if (!team.enabled) {
    return {
      ok: false,
      error: `Team disabled: ${teamId}`
    };
  }

  const run = createTeamRun(paths, {
    teamId: team.id,
    prompt,
    strategy: options.strategy ?? team.strategy
  });

  const memberResults = [];

  try {
    for (const member of team.members) {
      const memberPrompt = buildMemberPrompt(member, prompt, memberResults);

      const result = await runAgent(paths, member.agentId, memberPrompt, {
        model: member.model,
        mode: member.mode ?? "chat"
      });

      const memberResult = {
        agentId: member.agentId,
        role: member.role ?? "collaborator",
        ok: result.ok,
        text: result.text ?? null,
        error: result.error ?? null,
        conversationId: result.conversationId ?? null,
        createdAt: new Date().toISOString()
      };

      memberResults.push(memberResult);

      updateTeamRun(paths, run.id, {
        memberResults
      });

      if (!result.ok && options.stopOnFailure) {
        finishTeamRun(paths, run.id, {
          status: "failed",
          error: result.error,
          memberResults
        });

        return {
          ok: false,
          runId: run.id,
          teamId: team.id,
          error: result.error,
          memberResults
        };
      }
    }

    let synthesis = null;

    const reviewerAgentId = options.reviewerAgentId ?? team.reviewerAgentId;

    if (reviewerAgentId) {
      const synthesisPrompt = buildSynthesisPrompt(team, prompt, memberResults);

      const synthesisResult = await runAgent(paths, reviewerAgentId, synthesisPrompt, {
        mode: "chat"
      });

      synthesis = {
        agentId: reviewerAgentId,
        ok: synthesisResult.ok,
        text: synthesisResult.text ?? null,
        error: synthesisResult.error ?? null,
        conversationId: synthesisResult.conversationId ?? null,
        createdAt: new Date().toISOString()
      };
    }

    finishTeamRun(paths, run.id, {
      status: "complete",
      memberResults,
      synthesis
    });

    return {
      ok: true,
      runId: run.id,
      teamId: team.id,
      memberResults,
      synthesis
    };
  } catch (error) {
    finishTeamRun(paths, run.id, {
      status: "failed",
      error: error.message,
      memberResults
    });

    return {
      ok: false,
      runId: run.id,
      teamId: team.id,
      error: error.message,
      memberResults
    };
  }
}
JS

cat > packages/forge-core/src/commands/team.mjs <<'JS'
import { readFileSync } from "node:fs";
import { getForgePaths } from "../lib/paths.mjs";
import {
  createTeam,
  listTeamRuns,
  listTeams,
  readTeam,
  readTeamRun,
  updateTeam
} from "../collaboration/store.mjs";
import { runTeam } from "../collaboration/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

export default async function team(args = []) {
  const action = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);

  if (action === "create") {
    const id = args[1];
    const title = readFlag(args, "--title", id);
    const agentsRaw = readFlag(args, "--agents", "steward");

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge team create forge-council --agents steward,reviewer --title \"Forge Council\"");
      return;
    }

    const members = agentsRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((agentId, index) => ({
        id: `${agentId}-${index}`,
        agentId,
        role: index === 0 ? "planner" : "reviewer"
      }));

    const created = createTeam(paths, {
      id,
      title,
      description: "Generated multi-agent collaboration team.",
      members,
      reviewerAgentId: members.at(-1)?.agentId ?? null
    });

    console.log("✅ Team created");
    console.log(`id: ${created.id}`);
    console.log(`title: ${created.title}`);
    console.log(`members: ${created.members.length}`);
    return;
  }

  if (action === "import") {
    const file = args[1];

    if (!file) {
      console.log("Usage:");
      console.log("  aift-forge team import ./team.json");
      return;
    }

    const imported = JSON.parse(readFileSync(file, "utf8"));
    const created = createTeam(paths, imported);

    console.log("✅ Team imported");
    console.log(`id: ${created.id}`);
    console.log(`title: ${created.title}`);
    return;
  }

  if (action === "list") {
    const teams = listTeams(paths);

    console.log("👥 Forge Teams");
    console.log("");

    if (teams.length === 0) {
      console.log("No teams yet.");
      console.log("Create one:");
      console.log("  aift-forge team create forge-council --agents steward,reviewer");
      return;
    }

    for (const item of teams) {
      console.log(`${item.enabled ? "✅" : "⬜"} ${item.id} — ${item.title}`);
      console.log(`   members: ${item.members.map((member) => `${member.agentId}:${member.role}`).join(", ")}`);
      console.log(`   reviewer: ${item.reviewerAgentId ?? "none"}`);
    }

    return;
  }

  if (action === "show") {
    const id = args[1];
    const found = readTeam(paths, id);

    if (!found) {
      console.log(`❌ Team not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(found, null, 2));
    return;
  }

  if (action === "run") {
    const id = args[1];
    const prompt = args.slice(2).join(" ").trim();

    if (!id || !prompt) {
      console.log("Usage:");
      console.log("  aift-forge team run forge-council \"Plan the next Forge phase.\"");
      return;
    }

    const result = await runTeam(paths, id, prompt);

    if (!result.ok) {
      console.log(`❌ Team run failed: ${result.error}`);
      console.log(`run: ${result.runId ?? "none"}`);
      return;
    }

    console.log("✅ Team run complete");
    console.log(`team: ${result.teamId}`);
    console.log(`run: ${result.runId}`);

    for (const member of result.memberResults) {
      console.log("");
      console.log(`${member.ok ? "✅" : "❌"} ${member.agentId} — ${member.role}`);
      console.log(member.text ?? member.error ?? "");
    }

    if (result.synthesis) {
      console.log("");
      console.log("🧩 Synthesis");
      console.log(result.synthesis.text ?? result.synthesis.error ?? "");
    }

    return;
  }

  if (action === "runs") {
    const runs = listTeamRuns(paths);

    console.log("📜 Team Runs");
    console.log("");

    if (runs.length === 0) {
      console.log("No team runs yet.");
      return;
    }

    for (const run of runs) {
      console.log(`${run.status === "complete" ? "✅" : "🟡"} ${run.id}`);
      console.log(`   team: ${run.teamId}`);
      console.log(`   status: ${run.status}`);
      console.log(`   startedAt: ${run.startedAt}`);
    }

    return;
  }

  if (action === "run-show") {
    const id = args[1];
    const run = readTeamRun(paths, id);

    if (!run) {
      console.log(`❌ Team run not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(run, null, 2));
    return;
  }

  if (action === "enable") {
    const id = args[1];
    const updated = updateTeam(paths, id, { enabled: true });

    console.log(`✅ Enabled team: ${updated.id}`);
    return;
  }

  if (action === "disable") {
    const id = args[1];
    const updated = updateTeam(paths, id, { enabled: false });

    console.log(`⬜ Disabled team: ${updated.id}`);
    return;
  }

  console.log("Forge Multi-Agent Collaboration");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge team list");
  console.log("  aift-forge team create forge-council --agents steward,reviewer");
  console.log("  aift-forge team import ./team.json");
  console.log("  aift-forge team show forge-council");
  console.log("  aift-forge team run forge-council \"Plan the next Forge phase.\"");
  console.log("  aift-forge team runs");
  console.log("  aift-forge team run-show team-run-id");
  console.log("  aift-forge team enable forge-council");
  console.log("  aift-forge team disable forge-council");
}
JS

cat > scripts/aift-team-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import {
  createTeam,
  createTeamRun,
  finishTeamRun,
  listTeamRuns,
  listTeams,
  readTeam
} from "../packages/forge-core/src/collaboration/store.mjs";
import {
  buildMemberPrompt,
  buildSynthesisPrompt
} from "../packages/forge-core/src/collaboration/runtime.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/teams/test-team.json", { force: true });
rmSync(".forge/team-runs/test-team-run.json", { force: true });

const team = createTeam(paths, {
  id: "test-team",
  title: "Test Team",
  members: [
    {
      id: "planner",
      agentId: "test-agent",
      role: "planner"
    },
    {
      id: "reviewer",
      agentId: "test-agent",
      role: "reviewer"
    }
  ],
  reviewerAgentId: "test-agent"
});

assert.equal(team.id, "test-team");

const found = readTeam(paths, "test-team");
assert.equal(found.members.length, 2);

const memberPrompt = buildMemberPrompt(
  found.members[0],
  "Plan the system.",
  []
);

assert.ok(memberPrompt.includes("Plan the system."));

const synthesisPrompt = buildSynthesisPrompt(found, "Plan the system.", [
  {
    agentId: "test-agent",
    role: "planner",
    ok: true,
    text: "Build it carefully."
  }
]);

assert.ok(synthesisPrompt.includes("Build it carefully."));

const run = createTeamRun(paths, {
  id: "test-team-run",
  teamId: "test-team",
  prompt: "Plan"
});

assert.equal(run.teamId, "test-team");

const finished = finishTeamRun(paths, run.id, {
  status: "complete",
  memberResults: []
});

assert.equal(finished.status, "complete");

const teams = listTeams(paths);
assert.ok(teams.some((item) => item.id === "test-team"));

const runs = listTeamRuns(paths);
assert.ok(runs.some((item) => item.id === "test-team-run"));

console.log("✅ Multi-agent collaboration smoke test passed.");
JS

cat > docs/MULTI_AGENT_COLLABORATION_PHASE_6.md <<'MD'
# AIFT-Forge Phase 6: Multi-Agent Collaboration

Phase 6 adds local multi-agent teams.

Teams let Forge agents collaborate through explicit, inspectable JSON records.

## Storage

Team definitions:

    .forge/teams/

Team run records:

    .forge/team-runs/

## Team Object

A team contains:

- id
- title
- description
- strategy
- members
- reviewer agent
- permissions

## Member Object

A member contains:

- agent id
- role
- optional model override
- optional mode

## Commands

Create a team:

    aift-forge team create forge-council --agents steward,reviewer --title "Forge Council"

List teams:

    aift-forge team list

Show a team:

    aift-forge team show forge-council

Run a team:

    aift-forge team run forge-council "Plan the next Forge phase."

Show team runs:

    aift-forge team runs

Show a specific run:

    aift-forge team run-show team-run-id

Enable or disable:

    aift-forge team enable forge-council
    aift-forge team disable forge-council

## Governance

Multi-agent collaboration is:

- local-first
- JSON-backed
- inspectable
- replayable
- no cloud fallback
- no hidden background activity
- explicit agent identities
- explicit member roles
MD

node --check packages/forge-core/src/collaboration/store.mjs
node --check packages/forge-core/src/collaboration/runtime.mjs
node --check packages/forge-core/src/commands/team.mjs
node --check scripts/aift-team-smoke.mjs
node scripts/aift-team-smoke.mjs

echo ""
echo "✅ Phase 6 Multi-Agent Collaboration complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  team -> packages/forge-core/src/commands/team.mjs"
echo ""
echo "Then test:"
echo "  aift-forge team list"
echo "  aift-forge team create forge-council --agents steward,reviewer"
echo "  aift-forge team run forge-council \"Plan the next Forge phase.\""
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 6 multi-agent collaboration\""
echo "  git push origin main"
