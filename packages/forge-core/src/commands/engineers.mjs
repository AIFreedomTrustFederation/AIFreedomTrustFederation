import { listEngineers } from "../pipeline/engineers/index.mjs";
import { section, ok } from "../lib/logger.mjs";

export async function engineers() {
  console.log("🧠 Forge Engineers");

  const registered = await listEngineers();

  section("Registered Engineers");

  for (const engineer of registered) {
    ok(`${engineer.taskId} — ${engineer.file}`);
    if (engineer.description) {
      console.log(`   ${engineer.description}`);
    }
  }

  section("Summary");
  console.log(`Total: ${registered.length}`);
}
