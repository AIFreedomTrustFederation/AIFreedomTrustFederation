import {
  createApproval,
  ensureDefaultToolPolicy,
  readApproval,
  readToolPolicy
} from "./store.mjs";
import { readToolDefinition } from "./registry.mjs";

export function evaluateToolPermission(paths, toolId, input = {}, options = {}) {
  const policy = readToolPolicy(paths) ?? ensureDefaultToolPolicy(paths);
  const definition = readToolDefinition(toolId);

  if (!definition) {
    return {
      ok: false,
      decision: "deny",
      reason: `Unknown tool: ${toolId}`
    };
  }

  if ((policy.deniedTools ?? []).includes(toolId)) {
    if (options.approvalId) {
      const approval = readApproval(paths, options.approvalId);

      if (approval?.decision === "approved" && approval.toolId === toolId) {
        return {
          ok: true,
          decision: "allow",
          reason: "Approved by explicit approval record.",
          approvalId: approval.id
        };
      }
    }

    if (definition.requiresApproval || definition.risk !== "read") {
      const approval = createApproval(paths, {
        toolId,
        actor: options.actor ?? "local-user",
        input,
        reason: "Tool requires explicit approval."
      });

      return {
        ok: false,
        decision: "approval-required",
        reason: "Tool requires explicit approval.",
        approvalId: approval.id
      };
    }

    return {
      ok: false,
      decision: "deny",
      reason: "Tool is denied by policy."
    };
  }

  if ((policy.allowedTools ?? []).includes(toolId)) {
    return {
      ok: true,
      decision: "allow",
      reason: "Tool is allowed by policy."
    };
  }

  if (definition.risk === "read" && policy.allowReadOnlyTools) {
    return {
      ok: true,
      decision: "allow",
      reason: "Read-only tool allowed by policy."
    };
  }

  if (definition.requiresApproval || definition.risk !== "read") {
    const approval = createApproval(paths, {
      toolId,
      actor: options.actor ?? "local-user",
      input,
      reason: "Tool requires explicit approval."
    });

    return {
      ok: false,
      decision: "approval-required",
      reason: "Tool requires explicit approval.",
      approvalId: approval.id
    };
  }

  return {
    ok: false,
    decision: policy.defaultDecision ?? "deny",
    reason: "No matching allow rule."
  };
}
