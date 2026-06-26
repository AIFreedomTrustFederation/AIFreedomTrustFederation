import { getForgePaths } from "../lib/paths.mjs";
import { loadManifestBundle } from "../lib/manifest.mjs";
import { section, ok } from "../lib/logger.mjs";

function list(items = []) {
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}

export function manifest() {
  const paths = getForgePaths(import.meta.url);
  const bundle = loadManifestBundle(paths.repoRoot);

  console.log("📜 AIFT Forge Manifest");

  section("Forge Product");
  console.log(`Name:        ${bundle.forge.name}`);
  console.log(`Product ID:  ${bundle.forge.product_id}`);
  console.log(`Schema:      ${bundle.forge.schema}`);
  console.log(`Status:      ${bundle.forge.status}`);
  console.log(`Runtime:     ${bundle.forge.runtime_source_of_truth}`);
  console.log(`Mirror mode: ${bundle.forge.public_mirror_mode}`);
  console.log(`Updated:     ${bundle.forge.updated_at}`);

  section("Description");
  console.log(bundle.forge.description);

  section("Targets");
  list(bundle.forge.targets);

  section("Required Modules");
  list(bundle.forge.required_modules);

  section("Root Federation");
  console.log(`Name:       ${bundle.root.name}`);
  console.log(`Repo ID:    ${bundle.root.repo_id}`);
  console.log(`Role:       ${bundle.root.role}`);
  console.log(`Runtime:    ${bundle.root.runtime_source_of_truth}`);
  console.log(`Mirror:     ${bundle.root.public_mirror}`);
  console.log(`Updated:    ${bundle.root.updated_at}`);

  section("Principles");
  list(bundle.root.principles);

  section("Repo Classes");
  list(bundle.root.repo_classes);

  ok("Manifest loaded.");
}
