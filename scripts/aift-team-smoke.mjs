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
