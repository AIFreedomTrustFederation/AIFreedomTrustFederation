import { getForgePaths } from "../lib/paths.mjs";
import { discoverRepository } from "../discovery/repository.mjs";
import { buildRepositoryGraph } from "../discovery/graph.mjs";
import { detectGaps } from "../discovery/gaps.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

export async function discover(args = []) {
  const target = args[0] ?? "BookSmith-Federation-OS";
  const paths = getForgePaths(import.meta.url);
  const result = await discoverRepository(paths, target);

  console.log("🔎 Forge Repository Discovery");
  console.log(`Target: ${result.targetRepository}`);
  console.log(`Path: ${result.root}`);
  console.log(`Package: ${result.packageJsonName ?? "unknown"}`);

  section("Architecture Facts");
  for (const [key, value] of Object.entries(result.facts)) {
    console.log(`${value ? "✅" : "⬜"} ${key}`);
  }

  section("Candidate Tasks");
  if (!result.tasks.length) {
    ok("No candidate tasks discovered.");
  }

  for (const task of result.tasks) {
    const marker = task.engineer ? "✅" : "⚠️";
    console.log(`${marker} ${task.id}`);
    console.log(`   title: ${task.title}`);
    console.log(`   status: ${task.status}`);
    console.log(`   engineer: ${task.engineer ?? "missing"}`);
    console.log(`   dependsOn: ${(task.dependsOn ?? []).join(", ") || "none"}`);
  }

  section("Known Engineers");
  for (const engineer of result.engineers) {
    ok(engineer.taskId);
  }

  if (result.tasks.some((task) => !task.engineer)) {
    warn("Some discovered tasks do not have engineers yet.");
  }

  const graph = buildRepositoryGraph(result.root);
  const gaps = detectGaps(graph);

  section("Repository Graph");
  console.log(`Files scanned: ${graph.files.length}`);
  console.log(`Imports found: ${graph.imports.length}`);
  console.log(`Missing imports: ${graph.missingImports.length}`);
  console.log(`TODO/stub files: ${graph.todos.length}`);

  section("Graph Gaps");
  if (!gaps.length) ok("No graph gaps discovered.");
  for (const gap of gaps.slice(0, 10)) {
    console.log(`⚠️ ${gap.id}`);
    console.log(`   title: ${gap.title}`);
    console.log(`   source: ${gap.source}`);
  }
}

export default discover;
