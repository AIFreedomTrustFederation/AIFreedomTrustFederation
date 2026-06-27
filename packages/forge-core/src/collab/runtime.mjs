import { runAgent } from "../agents/runtime.mjs";
import {
  createClaim,
  createHandoff,
  createMessage,
  createVote,
  listClaims,
  listMessages,
  readRoom,
  updateClaim
} from "./store.mjs";

export function buildRoomContext(paths, roomId) {
  const room = readRoom(paths, roomId);
  const messages = listMessages(paths, roomId).slice(-20);
  const claims = listClaims(paths, roomId).slice(0, 20);

  return {
    room,
    messages,
    claims,
    text: [
      `Room: ${room?.title ?? roomId}`,
      `Purpose: ${room?.purpose ?? ""}`,
      "",
      "Recent messages:",
      messages.map((message) => `${message.fromAgentId}: ${message.body}`).join("\n") || "No messages yet.",
      "",
      "Claims:",
      claims.map((claim) => `${claim.agentId}: ${claim.workItem} (${claim.status})`).join("\n") || "No claims yet."
    ].join("\n")
  };
}

export async function askRoomAgent(paths, roomId, agentId, prompt) {
  const context = buildRoomContext(paths, roomId);

  if (!context.room) {
    return {
      ok: false,
      error: `Room not found: ${roomId}`
    };
  }

  const fullPrompt = [
    "You are participating in an AIFT-Forge autonomous collaboration room.",
    "",
    context.text,
    "",
    "User/request:",
    prompt,
    "",
    "Respond with a practical contribution and identify any work you are willing to claim."
  ].join("\n");

  const result = await runAgent(paths, agentId, fullPrompt);

  if (!result.ok) {
    createMessage(paths, {
      roomId,
      fromAgentId: agentId,
      type: "error",
      body: result.error ?? "Agent failed."
    });

    return result;
  }

  createMessage(paths, {
    roomId,
    fromAgentId: agentId,
    type: "agent-response",
    body: result.text,
    refs: [
      {
        type: "conversation",
        id: result.conversationId
      }
    ]
  });

  return result;
}

export async function runRoomRound(paths, roomId, prompt) {
  const room = readRoom(paths, roomId);

  if (!room) {
    return {
      ok: false,
      error: `Room not found: ${roomId}`
    };
  }

  const results = [];

  createMessage(paths, {
    roomId,
    fromAgentId: "local-user",
    type: "round-prompt",
    body: prompt
  });

  for (const member of room.agents ?? []) {
    const result = await askRoomAgent(paths, roomId, member.agentId, prompt);

    results.push({
      agentId: member.agentId,
      role: member.role,
      ok: result.ok,
      text: result.text ?? null,
      error: result.error ?? null,
      conversationId: result.conversationId ?? null
    });
  }

  return {
    ok: results.every((item) => item.ok),
    roomId,
    results
  };
}

export async function claimAndRun(paths, roomId, agentId, workItem, prompt) {
  const claim = createClaim(paths, {
    roomId,
    agentId,
    workItem,
    status: "running"
  });

  const result = await askRoomAgent(paths, roomId, agentId, prompt || `Work on this item: ${workItem}`);

  updateClaim(paths, claim.id, {
    status: result.ok ? "complete" : "failed",
    result: result.ok ? result.text : result.error
  });

  return {
    ...result,
    claimId: claim.id
  };
}

export function propose(paths, roomId, proposal) {
  return createVote(paths, {
    roomId,
    proposal
  });
}

export function handoff(paths, roomId, fromAgentId, toAgentId, workItem, context = "") {
  const record = createHandoff(paths, {
    roomId,
    fromAgentId,
    toAgentId,
    workItem,
    context
  });

  createMessage(paths, {
    roomId,
    fromAgentId,
    toAgentId,
    type: "handoff",
    body: `Handoff: ${workItem}\n\n${context}`,
    refs: [
      {
        type: "handoff",
        id: record.id
      }
    ]
  });

  return record;
}
