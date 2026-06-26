import { execSync } from "node:child_process";
import { getForgePaths } from "../lib/paths.mjs";
import { PipelineEngine } from "../pipeline/engine.mjs";
import { loadMission, calculateMissionProgress, missionPath } from "../mission/state.mjs";
import { section, ok, warn, fail } from "../lib/logger.mjs";

function runCommand(command, cwd) {
  try {
    const output = execSync(command, {
      cwd,
      encoding: "utf8",
      stdio: "pipe"
    }).trim();

    return {
      ok: true,
      output
    };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim()
    };
  }
}

function gitStatus(cwd) {
  return runCommand("git status --short", cwd).output;
}

function gitBranch(cwd) {
  return runCommand("git branch --show-current", cwd).output || "unknown";
}

export async function run(args = []) {
  const publish = args.includes("--publish");
  const paths = getForgePaths(import.meta.url);
  const mission = loadMission(paths.repoRoot);

  console.log("🚀 Forge Unified Engineering Run");

  section("Observe");
  console.log(`Repo: ${paths.repoRoot}`);
  console.log(`AIFT Root: ${paths.aiftRoot}`);
  console.log(`Branch: ${gitBranch(paths.repoRoot)}`);

  const status = gitStatus(paths.repoRoot);
  if (status) {
    warn("Forge repo has local changes before run:");
    console.log(status);
  } else {
    ok("Forge repo clean");
  }

  section("Mission File");
  console.log(missionPath(paths.repoRoot));

  section("Mission");
  console.log(mission.title);
  console.log(`State: ${mission.state}`);
  console.log(`Authority: ${mission.authorityLevel}`);
  console.log(`Progress: ${calculateMissionProgress(mission)}%`);

  if (mission.state !== "approved") {
    fail("Mission is not approved.");
    console.log("Run:");
    console.log("  aift-forge mission approve");
    return;
  }

  section("Doctor");
  const doctor = runCommand("aift-forge doctor", paths.repoRoot);

  if (!doctor.ok) {
    fail("Doctor failed.");
    console.log(doctor.output);
    return;
  }

  ok("Doctor passed.");

  section("Pipeline");
  const engine = new PipelineEngine({ paths });
  await engine.run({ publish });

  section("Review");
  const afterStatus = gitStatus(paths.repoRoot);

  if (afterStatus) {
    console.log("Forge repo changes:");
    console.log(afterStatus);
  } else {
    ok("Forge repo clean after run.");
  }

  section("Publisher");
  if (!publish) {
    warn("Publish not requested.");
    console.log("To publish after reviewing changes:");
    console.log("  git add .");
    console.log("  git commit -m \"Run Forge engineering pipeline\"");
    console.log("  git push origin main");
    return;
  }

  warn("Publish requested, but automatic publish remains disabled by governance.");
  console.log("Manual publish required:");
  console.log("  git add .");
  console.log("  git commit -m \"Run Forge engineering pipeline\"");
  console.log("  git push origin main");
}
