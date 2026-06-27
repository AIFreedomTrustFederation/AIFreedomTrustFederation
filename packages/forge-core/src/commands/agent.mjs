import { createAgentPacket } from "../agent/packet.mjs";
import { section, ok, warn } from "../lib/logger.mjs";

export function agent(args = []) {
  const action = args[0] ?? "task";

  if (action === "task") {
    const result = createAgentPacket();

    if (!result) {
      warn("No executable task available for agent packet.");
      return;
    }

    console.log("🤖 Forge Agent Task Packet");
    section("Packet");
    ok(result.file);

    section("Task");
    console.log(result.packet.task.title);

    section("Next");
    console.log("Send this packet to an AI coding agent, then apply the returned patch through Forge review.");
    return;
  }

  console.log("Forge Agent");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge agent task");
}
