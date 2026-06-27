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
