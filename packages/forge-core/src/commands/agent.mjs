import { createAgentPacket } from "../agent/packet.mjs";
import { reviewPatchFile } from "../agent/review.mjs";
import { agents } from "./agents.mjs";
import { section, ok, warn, fail } from "../lib/logger.mjs";

export function agent(args = []) {
  const action = args[0] ?? "task";

  if (action === "list" || action === "backends") {
    agents();
    return;
  }

  if (action === "task") {
    const result = createAgentPacket();

    if (!result) {
      warn("No executable task available for agent packet.");
      return;
    }

    console.log("🤖 Forge Agent Task Packet");

    section("Packet");
    ok(result.file);

    section("Backend");
    if (result.packet.backend) {
      console.log(`${result.packet.backend.id} — ${result.packet.backend.label}`);
    } else {
      warn("No backend selected.");
    }

    section("Task");
    console.log(result.packet.task.title);

    section("Required Capabilities");
    console.log(result.packet.requiredCapabilities.join(", "));

    section("Next");
    console.log("Send this packet to an AI coding agent.");
    console.log("Place returned patch in:");
    console.log("  .forge/agent-patches/");
    console.log("Then run:");
    console.log("  aift-forge agent review .forge/agent-patches/YOUR_PATCH.diff");
    return;
  }

  if (action === "review") {
    const patch = args[1];

    if (!patch) {
      fail("Missing patch file.");
      console.log("Usage:");
      console.log("  aift-forge agent review .forge/agent-patches/YOUR_PATCH.diff");
      return;
    }

    const result = reviewPatchFile(patch);

    if (!result.ok) {
      fail(result.error);
      return;
    }

    console.log("🧾 Forge Agent Patch Review");

    section("Review");
    console.log(`Score: ${result.score}`);
    console.log(`Approved: ${result.approved ? "yes" : "no"}`);

    if (result.warnings.length) {
      section("Warnings");
      for (const warning of result.warnings) {
        warn(warning);
      }
    }

    section("Review File");
    ok(result.reviewFile);
    return;
  }

  console.log("Forge Agent");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge agent task");
  console.log("  aift-forge agent list");
  console.log("  aift-forge agent review .forge/agent-patches/YOUR_PATCH.diff");
}
