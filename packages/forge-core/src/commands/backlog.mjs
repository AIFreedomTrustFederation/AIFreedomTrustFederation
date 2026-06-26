import { existsSync } from "node:fs";
import { join } from "node:path";
import { backlogItems, completedCapabilities } from "../backlog/items.mjs";
import { getForgePaths } from "../lib/paths.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

function isItemComplete(repoRoot, item) {
  return item.files.every((file) => existsSync(join(repoRoot, file)));
}

function dependenciesMet(item) {
  return item.dependsOn.every((dependency) => completedCapabilities.includes(dependency));
}

function inspectBacklog(repoRoot) {
  return backlogItems.map((item) => ({
    ...item,
    complete: isItemComplete(repoRoot, item),
    ready: dependenciesMet(item)
  }));
}

function printItem(item) {
  const mark = item.complete ? "✅" : item.ready ? "⬜" : "⏳";
  console.log(`${mark} [P${item.priority}] ${item.title}`);
  console.log(`   ID: ${item.id}`);
  console.log(`   Category: ${item.category}`);
  console.log(`   Description: ${item.description}`);
  console.log(`   Command: ${item.command}`);
  if (item.dependsOn.length) {
    console.log(`   Depends on: ${item.dependsOn.join(", ")}`);
  }
  console.log("");
}

export function backlog(args = []) {
  const mode = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);
  const inspected = inspectBacklog(paths.repoRoot);

  const completed = inspected.filter((item) => item.complete);
  const open = inspected.filter((item) => !item.complete);
  const ready = open.filter((item) => item.ready);
  const blocked = open.filter((item) => !item.ready);

  console.log("🧠 Forge Development Backlog");

  if (mode === "next") {
    section("Next Recommended Task");

    const next = ready.sort((a, b) => a.priority - b.priority)[0];

    if (!next) {
      if (open.length === 0) {
        ok("Backlog complete.");
      } else {
        warn("No ready tasks. Resolve dependencies first.");
      }
      return;
    }

    printItem(next);
    return;
  }

  section("Summary");
  console.log(`Completed: ${completed.length}`);
  console.log(`Open:      ${open.length}`);
  console.log(`Ready:     ${ready.length}`);
  console.log(`Blocked:   ${blocked.length}`);

  section("Ready");
  for (const item of ready.sort((a, b) => a.priority - b.priority)) {
    printItem(item);
  }

  if (blocked.length) {
    section("Blocked");
    for (const item of blocked.sort((a, b) => a.priority - b.priority)) {
      printItem(item);
    }
  }

  section("Suggested");
  console.log("Run:");
  console.log("  aift-forge backlog next");
}
