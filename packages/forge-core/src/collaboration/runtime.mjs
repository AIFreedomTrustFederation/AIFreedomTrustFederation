import { runAgent } from "../agents/runtime.mjs";
import {
  createTeamRun,
  finishTeamRun,
  readTeam,
  updateTeamRun
} from "./store.mjs";

export function buildMemberPrompt(member, teamPrompt, previousResults = []) {
  const role = member.role ?? "collaborator";
  const prior = previousResults.length === 0
    ? "No prior member responses yet."
    : previousResults
        .map((result) => `Agent ${result.agentId} (${result.role}):\n${result.text ?? result.error ?? ""}`)
        .join("\n\n");

  return [
    `You are acting as the ${role} in an AIFT-Forge local multi-agent team.`,
    "",
    "Team prompt:",
    teamPrompt,
    "",
    "Prior member responses:",
    prior,
    "",
    "Provide your contribution. Stay local-first, inspectable, and practical."
  ].join("\n");
}

export function buildSynthesisPrompt(team, teamPrompt, memberResults = []) {
  const body = memberResults
    .map((result) => [
      `Agent: ${result.agentId}`,
      `Role: ${result.role}`,
      `Status: ${result.ok ? "ok" : "failed"}`,
      "Contribution:",
      result.text ?? result.error ?? ""
    ].join("\n"))
    .join("\n\n---\n\n");

  return [
    "You are synthesizing a local AIFT-Forge multi-agent collaboration run.",
    "",
    `Team: ${team.title}`,
    "",
    "Original prompt:",
    teamPrompt,
    "",
    "Member contributions:",
    body,
    "",
    "Create a unified synthesis with decisions, risks, and next actions."
  ].join("\n");
}

export async function runTeam(paths, teamId, prompt, options = {}) {
  const team = readTeam(paths, teamId);

  if (!team) {
    return {
      ok: false,
      error: `Team not found: ${teamId}`
    };
  }

  if (!team.enabled) {
    return {
      ok: false,
      error: `Team disabled: ${teamId}`
    };
  }

  const run = createTeamRun(paths, {
    teamId: team.id,
    prompt,
    strategy: options.strategy ?? team.strategy
  });

  const memberResults = [];

  try {
    for (const member of team.members) {
      const memberPrompt = buildMemberPrompt(member, prompt, memberResults);

      const result = await runAgent(paths, member.agentId, memberPrompt, {
        model: member.model,
        mode: member.mode ?? "chat"
      });

      const memberResult = {
        agentId: member.agentId,
        role: member.role ?? "collaborator",
        ok: result.ok,
        text: result.text ?? null,
        error: result.error ?? null,
        conversationId: result.conversationId ?? null,
        createdAt: new Date().toISOString()
      };

      memberResults.push(memberResult);

      updateTeamRun(paths, run.id, {
        memberResults
      });

      if (!result.ok && options.stopOnFailure) {
        finishTeamRun(paths, run.id, {
          status: "failed",
          error: result.error,
          memberResults
        });

        return {
          ok: false,
          runId: run.id,
          teamId: team.id,
          error: result.error,
          memberResults
        };
      }
    }

    let synthesis = null;

    const reviewerAgentId = options.reviewerAgentId ?? team.reviewerAgentId;

    if (reviewerAgentId) {
      const synthesisPrompt = buildSynthesisPrompt(team, prompt, memberResults);

      const synthesisResult = await runAgent(paths, reviewerAgentId, synthesisPrompt, {
        mode: "chat"
      });

      synthesis = {
        agentId: reviewerAgentId,
        ok: synthesisResult.ok,
        text: synthesisResult.text ?? null,
        error: synthesisResult.error ?? null,
        conversationId: synthesisResult.conversationId ?? null,
        createdAt: new Date().toISOString()
      };
    }

    finishTeamRun(paths, run.id, {
      status: "complete",
      memberResults,
      synthesis
    });

    return {
      ok: true,
      runId: run.id,
      teamId: team.id,
      memberResults,
      synthesis
    };
  } catch (error) {
    finishTeamRun(paths, run.id, {
      status: "failed",
      error: error.message,
      memberResults
    });

    return {
      ok: false,
      runId: run.id,
      teamId: team.id,
      error: error.message,
      memberResults
    };
  }
}
