#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🤝 AIFT-Forge Phase 11: Autonomous Multi-Agent Collaboration"

mkdir -p packages/forge-core/src/collab
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/collab/rooms
mkdir -p .forge/collab/messages
mkdir -p .forge/collab/claims
mkdir -p .forge/collab/votes
mkdir -p .forge/collab/handoffs

cat > packages/forge-core/src/collab/store.mjs <<'JS'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function collabDir(paths) {
  return join(paths.repoRoot, ".forge", "collab");
}

export function roomsDir(paths) {
  return join(collabDir(paths), "rooms");
}

export function messagesDir(paths) {
  return join(collabDir(paths), "messages");
}

export function claimsDir(paths) {
  return join(collabDir(paths), "claims");
}

export function votesDir(paths) {
  return join(collabDir(paths), "votes");
}

export function handoffsDir(paths) {
  return join(collabDir(paths), "handoffs");
}

export function ensureCollabStore(paths) {
  mkdirSync(roomsDir(paths), { recursive: true });
  mkdirSync(messagesDir(paths), { recursive: true });
  mkdirSync(claimsDir(paths), { recursive: true });
  mkdirSync(votesDir(paths), { recursive: true });
  mkdirSync(handoffsDir(paths), { recursive: true });
}

export function normalizeId(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function roomFile(paths, id) {
  return join(roomsDir(paths), `${normalizeId(id)}.json`);
}

export function messageFile(paths, id) {
  return join(messagesDir(paths), `${normalizeId(id)}.json`);
}

export function claimFile(paths, id) {
  return join(claimsDir(paths), `${normalizeId(id)}.json`);
}

export function voteFile(paths, id) {
  return join(votesDir(paths), `${normalizeId(id)}.json`);
}

export function handoffFile(paths, id) {
  return join(handoffsDir(paths), `${normalizeId(id)}.json`);
}

export function createRoom(paths, room) {
  ensureCollabStore(paths);

  const id = normalizeId(room.id ?? `room-${Date.now()}`);

  const next = {
    schema: "aift.forge.collab-room.v1",
    id,
    title: room.title ?? id,
    purpose: room.purpose ?? "",
    status: room.status ?? "open",
    agents: room.agents ?? [],
    sharedMemory: room.sharedMemory ?? [],
    policies: room.policies ?? {
      localFirst: true,
      noCloudFallback: true,
      explicitToolPermission: true,
      consensusRequiredForWrites: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(roomFile(paths, id), next);
  return next;
}

export function readRoom(paths, id) {
  ensureCollabStore(paths);

  const file = roomFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listRooms(paths) {
  ensureCollabStore(paths);

  return readdirSync(roomsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(roomsDir(paths), file)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function updateRoom(paths, id, patch) {
  const existing = readRoom(paths, id);
  if (!existing) throw new Error(`Collab room not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  writeJson(roomFile(paths, id), next);
  return next;
}

export function addRoomAgent(paths, roomId, agentId, role = "collaborator") {
  const room = readRoom(paths, roomId);
  if (!room) throw new Error(`Collab room not found: ${roomId}`);

  const agents = [...(room.agents ?? [])];

  if (!agents.some((agent) => agent.agentId === agentId)) {
    agents.push({
      agentId,
      role,
      joinedAt: new Date().toISOString()
    });
  }

  return updateRoom(paths, roomId, { agents });
}

export function createMessage(paths, message) {
  ensureCollabStore(paths);

  const id = normalizeId(message.id ?? `msg-${Date.now()}`);

  const next = {
    schema: "aift.forge.collab-message.v1",
    id,
    roomId: normalizeId(message.roomId),
    fromAgentId: message.fromAgentId ?? "local-user",
    toAgentId: message.toAgentId ?? null,
    type: message.type ?? "message",
    body: message.body ?? "",
    refs: message.refs ?? [],
    createdAt: new Date().toISOString()
  };

  writeJson(messageFile(paths, id), next);
  return next;
}

export function listMessages(paths, roomId = null) {
  ensureCollabStore(paths);

  return readdirSync(messagesDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(messagesDir(paths), file)))
    .filter((message) => !roomId || message.roomId === normalizeId(roomId))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function createClaim(paths, claim) {
  ensureCollabStore(paths);

  const id = normalizeId(claim.id ?? `claim-${Date.now()}`);

  const next = {
    schema: "aift.forge.collab-claim.v1",
    id,
    roomId: normalizeId(claim.roomId),
    agentId: claim.agentId,
    workItem: claim.workItem,
    status: claim.status ?? "claimed",
    result: claim.result ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(claimFile(paths, id), next);
  return next;
}

export function readClaim(paths, id) {
  ensureCollabStore(paths);

  const file = claimFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listClaims(paths, roomId = null) {
  ensureCollabStore(paths);

  return readdirSync(claimsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(claimsDir(paths), file)))
    .filter((claim) => !roomId || claim.roomId === normalizeId(roomId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function updateClaim(paths, id, patch) {
  const existing = readClaim(paths, id);
  if (!existing) throw new Error(`Claim not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  writeJson(claimFile(paths, id), next);
  return next;
}

export function createVote(paths, vote) {
  ensureCollabStore(paths);

  const id = normalizeId(vote.id ?? `vote-${Date.now()}`);

  const next = {
    schema: "aift.forge.collab-vote.v1",
    id,
    roomId: normalizeId(vote.roomId),
    proposal: vote.proposal,
    votes: vote.votes ?? [],
    status: vote.status ?? "open",
    threshold: Number(vote.threshold ?? 0.5),
    result: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(voteFile(paths, id), next);
  return next;
}

export function readVote(paths, id) {
  ensureCollabStore(paths);

  const file = voteFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listVotes(paths, roomId = null) {
  ensureCollabStore(paths);

  return readdirSync(votesDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(votesDir(paths), file)))
    .filter((vote) => !roomId || vote.roomId === normalizeId(roomId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function castVote(paths, voteId, agentId, decision, reason = "") {
  const vote = readVote(paths, voteId);
  if (!vote) throw new Error(`Vote not found: ${voteId}`);

  const votes = (vote.votes ?? []).filter((item) => item.agentId !== agentId);

  votes.push({
    agentId,
    decision,
    reason,
    createdAt: new Date().toISOString()
  });

  const yes = votes.filter((item) => item.decision === "yes").length;
  const no = votes.filter((item) => item.decision === "no").length;
  const total = votes.length;
  const approvalRatio = total === 0 ? 0 : yes / total;

  const status = approvalRatio >= vote.threshold
    ? "approved"
    : no > yes && total >= 2
      ? "rejected"
      : "open";

  const next = {
    ...vote,
    votes,
    status,
    result: status === "open" ? null : status,
    updatedAt: new Date().toISOString()
  };

  writeJson(voteFile(paths, voteId), next);
  return next;
}

export function createHandoff(paths, handoff) {
  ensureCollabStore(paths);

  const id = normalizeId(handoff.id ?? `handoff-${Date.now()}`);

  const next = {
    schema: "aift.forge.collab-handoff.v1",
    id,
    roomId: normalizeId(handoff.roomId),
    fromAgentId: handoff.fromAgentId,
    toAgentId: handoff.toAgentId,
    workItem: handoff.workItem,
    context: handoff.context ?? "",
    status: handoff.status ?? "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(handoffFile(paths, id), next);
  return next;
}

export function listHandoffs(paths, roomId = null) {
  ensureCollabStore(paths);

  return readdirSync(handoffsDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(handoffsDir(paths), file)))
    .filter((handoff) => !roomId || handoff.roomId === normalizeId(roomId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
JS

cat > packages/forge-core/src/collab/runtime.mjs <<'JS'
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
JS

cat > packages/forge-core/src/commands/collab.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  addRoomAgent,
  castVote,
  createMessage,
  createRoom,
  listClaims,
  listHandoffs,
  listMessages,
  listRooms,
  listVotes,
  readRoom
} from "../collab/store.mjs";
import {
  claimAndRun,
  handoff,
  propose,
  runRoomRound
} from "../collab/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

export default async function collab(args = []) {
  const action = args[0] ?? "rooms";
  const paths = getForgePaths(import.meta.url);

  if (action === "room-create") {
    const id = args[1];
    const title = readFlag(args, "--title", id);
    const purpose = readFlag(args, "--purpose", "");

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge collab room-create forge-room --title \"Forge Room\" --purpose \"Plan Forge\"");
      return;
    }

    const room = createRoom(paths, {
      id,
      title,
      purpose
    });

    console.log("✅ Collaboration room created");
    console.log(`id: ${room.id}`);
    console.log(`title: ${room.title}`);
    return;
  }

  if (action === "rooms") {
    const rooms = listRooms(paths);

    console.log("🤝 Collaboration Rooms");
    console.log("");

    if (rooms.length === 0) {
      console.log("No collaboration rooms yet.");
      return;
    }

    for (const room of rooms) {
      console.log(`${room.status === "open" ? "✅" : "⬜"} ${room.id} — ${room.title}`);
      console.log(`   agents: ${(room.agents ?? []).map((agent) => `${agent.agentId}:${agent.role}`).join(", ") || "none"}`);
    }

    return;
  }

  if (action === "room-show") {
    const id = args[1];
    const room = readRoom(paths, id);

    if (!room) {
      console.log(`❌ Room not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(room, null, 2));
    return;
  }

  if (action === "join") {
    const roomId = args[1];
    const agentId = args[2];
    const role = readFlag(args, "--role", "collaborator");

    if (!roomId || !agentId) {
      console.log("Usage:");
      console.log("  aift-forge collab join forge-room steward --role planner");
      return;
    }

    const room = addRoomAgent(paths, roomId, agentId, role);

    console.log("✅ Agent joined room");
    console.log(`room: ${room.id}`);
    console.log(`agent: ${agentId}`);
    console.log(`role: ${role}`);
    return;
  }

  if (action === "say") {
    const roomId = args[1];
    const body = args.slice(2).join(" ").trim();

    if (!roomId || !body) {
      console.log("Usage:");
      console.log("  aift-forge collab say forge-room \"We should inspect repo health.\"");
      return;
    }

    const message = createMessage(paths, {
      roomId,
      fromAgentId: "local-user",
      body
    });

    console.log("✅ Message added");
    console.log(`id: ${message.id}`);
    return;
  }

  if (action === "messages") {
    const roomId = args[1];
    const messages = listMessages(paths, roomId);

    console.log("💬 Collaboration Messages");
    console.log("");

    if (messages.length === 0) {
      console.log("No messages yet.");
      return;
    }

    for (const message of messages) {
      console.log(`${message.createdAt} ${message.fromAgentId}${message.toAgentId ? ` -> ${message.toAgentId}` : ""}`);
      console.log(`   ${message.body}`);
    }

    return;
  }

  if (action === "round") {
    const roomId = args[1];
    const prompt = args.slice(2).join(" ").trim();

    if (!roomId || !prompt) {
      console.log("Usage:");
      console.log("  aift-forge collab round forge-room \"Plan the next milestone.\"");
      return;
    }

    const result = await runRoomRound(paths, roomId, prompt);

    if (!result.ok) {
      console.log("⚠️ Round completed with failures.");
    } else {
      console.log("✅ Round complete");
    }

    for (const item of result.results ?? []) {
      console.log("");
      console.log(`${item.ok ? "✅" : "❌"} ${item.agentId} — ${item.role}`);
      console.log(item.text ?? item.error ?? "");
    }

    return;
  }

  if (action === "claim") {
    const roomId = args[1];
    const agentId = args[2];
    const workItem = readFlag(args, "--work");
    const prompt = args.slice(3).join(" ").trim();

    if (!roomId || !agentId || !workItem) {
      console.log("Usage:");
      console.log("  aift-forge collab claim forge-room steward --work \"Review repo\" \"Review repo health.\"");
      return;
    }

    const result = await claimAndRun(paths, roomId, agentId, workItem, prompt);

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      console.log(`claim: ${result.claimId}`);
      return;
    }

    console.log(result.text);
    console.log("");
    console.log(`claim: ${result.claimId}`);
    return;
  }

  if (action === "claims") {
    const roomId = args[1];
    const claims = listClaims(paths, roomId);

    console.log("📌 Work Claims");
    console.log("");

    if (claims.length === 0) {
      console.log("No claims yet.");
      return;
    }

    for (const claim of claims) {
      console.log(`${claim.status === "complete" ? "✅" : "🟡"} ${claim.id}`);
      console.log(`   room: ${claim.roomId}`);
      console.log(`   agent: ${claim.agentId}`);
      console.log(`   work: ${claim.workItem}`);
      console.log(`   status: ${claim.status}`);
    }

    return;
  }

  if (action === "propose") {
    const roomId = args[1];
    const proposal = args.slice(2).join(" ").trim();

    if (!roomId || !proposal) {
      console.log("Usage:");
      console.log("  aift-forge collab propose forge-room \"Approve Phase 12 plan\"");
      return;
    }

    const vote = propose(paths, roomId, proposal);

    console.log("✅ Proposal opened");
    console.log(`vote: ${vote.id}`);
    return;
  }

  if (action === "vote") {
    const voteId = args[1];
    const agentId = readFlag(args, "--agent", "local-user");
    const decision = readFlag(args, "--decision", "yes");
    const reason = readFlag(args, "--reason", "");

    if (!voteId) {
      console.log("Usage:");
      console.log("  aift-forge collab vote vote-id --agent steward --decision yes");
      return;
    }

    const vote = castVote(paths, voteId, agentId, decision, reason);

    console.log("✅ Vote cast");
    console.log(`vote: ${vote.id}`);
    console.log(`status: ${vote.status}`);
    return;
  }

  if (action === "votes") {
    const roomId = args[1];
    const votes = listVotes(paths, roomId);

    console.log("🗳️ Votes");
    console.log("");

    if (votes.length === 0) {
      console.log("No votes yet.");
      return;
    }

    for (const vote of votes) {
      console.log(`${vote.status === "approved" ? "✅" : vote.status === "rejected" ? "❌" : "🟡"} ${vote.id}`);
      console.log(`   room: ${vote.roomId}`);
      console.log(`   proposal: ${vote.proposal}`);
      console.log(`   votes: ${(vote.votes ?? []).length}`);
    }

    return;
  }

  if (action === "handoff") {
    const roomId = args[1];
    const fromAgentId = readFlag(args, "--from");
    const toAgentId = readFlag(args, "--to");
    const workItem = readFlag(args, "--work");
    const context = args.slice(2).join(" ").trim();

    if (!roomId || !fromAgentId || !toAgentId || !workItem) {
      console.log("Usage:");
      console.log("  aift-forge collab handoff forge-room --from planner --to coder --work \"Implement task\" \"Context here\"");
      return;
    }

    const record = handoff(paths, roomId, fromAgentId, toAgentId, workItem, context);

    console.log("✅ Handoff created");
    console.log(`handoff: ${record.id}`);
    return;
  }

  if (action === "handoffs") {
    const roomId = args[1];
    const records = listHandoffs(paths, roomId);

    console.log("🔁 Handoffs");
    console.log("");

    if (records.length === 0) {
      console.log("No handoffs yet.");
      return;
    }

    for (const record of records) {
      console.log(`🔁 ${record.id}`);
      console.log(`   ${record.fromAgentId} -> ${record.toAgentId}`);
      console.log(`   work: ${record.workItem}`);
      console.log(`   status: ${record.status}`);
    }

    return;
  }

  console.log("Forge Autonomous Multi-Agent Collaboration");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge collab room-create forge-room --title \"Forge Room\"");
  console.log("  aift-forge collab join forge-room steward --role planner");
  console.log("  aift-forge collab say forge-room \"Message\"");
  console.log("  aift-forge collab round forge-room \"Plan the next milestone.\"");
  console.log("  aift-forge collab claim forge-room steward --work \"Review repo\" \"Review repo health.\"");
  console.log("  aift-forge collab propose forge-room \"Approve plan\"");
  console.log("  aift-forge collab vote vote-id --agent steward --decision yes");
  console.log("  aift-forge collab handoff forge-room --from planner --to coder --work \"Build feature\"");
}
JS

cat > scripts/aift-collab-smoke.mjs <<'JS'
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import {
  addRoomAgent,
  castVote,
  createClaim,
  createMessage,
  createRoom,
  createVote,
  listClaims,
  listMessages,
  listRooms,
  listVotes,
  readRoom
} from "../packages/forge-core/src/collab/store.mjs";
import {
  buildRoomContext,
  handoff
} from "../packages/forge-core/src/collab/runtime.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/collab", { recursive: true, force: true });

const room = createRoom(paths, {
  id: "test-room",
  title: "Test Room",
  purpose: "Testing collaboration"
});

assert.equal(room.id, "test-room");

addRoomAgent(paths, "test-room", "test-agent", "planner");

const found = readRoom(paths, "test-room");
assert.equal(found.agents.length, 1);

createMessage(paths, {
  roomId: "test-room",
  fromAgentId: "local-user",
  body: "Hello team"
});

const messages = listMessages(paths, "test-room");
assert.equal(messages.length, 1);

const claim = createClaim(paths, {
  roomId: "test-room",
  agentId: "test-agent",
  workItem: "Review plan"
});

assert.equal(claim.workItem, "Review plan");

const vote = createVote(paths, {
  roomId: "test-room",
  proposal: "Approve test plan"
});

const voted = castVote(paths, vote.id, "test-agent", "yes", "Looks good");
assert.equal(voted.status, "approved");

const handoffRecord = handoff(
  paths,
  "test-room",
  "test-agent",
  "second-agent",
  "Continue review",
  "Context"
);

assert.equal(handoffRecord.toAgentId, "second-agent");

const context = buildRoomContext(paths, "test-room");
assert.ok(context.text.includes("Hello team"));

assert.ok(listRooms(paths).some((item) => item.id === "test-room"));
assert.ok(listClaims(paths, "test-room").length >= 1);
assert.ok(listVotes(paths, "test-room").length >= 1);

console.log("✅ Autonomous multi-agent collaboration smoke test passed.");
JS

cat > docs/AUTONOMOUS_COLLABORATION_PHASE_11.md <<'MD'
# AIFT-Forge Phase 11: Autonomous Multi-Agent Collaboration

Phase 11 adds collaboration rooms, agent messaging, work claims, voting, and handoffs.

## Storage

Records live under:

    .forge/collab/

Subdirectories:

    rooms/
    messages/
    claims/
    votes/
    handoffs/

## Concepts

### Collaboration Room

A local workspace where agents coordinate.

### Message

A room-scoped communication record.

### Claim

A work item claimed by an agent.

### Vote

A consensus proposal with recorded votes.

### Handoff

A transfer of work/context from one agent to another.

## Commands

Create a room:

    aift-forge collab room-create forge-room --title "Forge Room"

Join an agent:

    aift-forge collab join forge-room steward --role planner

Send a message:

    aift-forge collab say forge-room "We should review repo health."

Run a round:

    aift-forge collab round forge-room "Plan the next milestone."

Claim work:

    aift-forge collab claim forge-room steward --work "Review repo" "Review repo health."

Create proposal:

    aift-forge collab propose forge-room "Approve Phase 12 plan"

Vote:

    aift-forge collab vote vote-id --agent steward --decision yes

Handoff:

    aift-forge collab handoff forge-room --from planner --to coder --work "Build feature"

## Governance

Collaboration is:

- local-first
- JSON-backed
- inspectable
- no cloud fallback
- explicit agent identity
- explicit work claims
- explicit votes
- explicit handoffs
MD

node --check packages/forge-core/src/collab/store.mjs
node --check packages/forge-core/src/collab/runtime.mjs
node --check packages/forge-core/src/commands/collab.mjs
node --check scripts/aift-collab-smoke.mjs
node scripts/aift-collab-smoke.mjs

echo ""
echo "✅ Phase 11 Autonomous Multi-Agent Collaboration complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  collab -> packages/forge-core/src/commands/collab.mjs"
echo ""
echo "Then test:"
echo "  aift-forge collab room-create forge-room --title \"Forge Room\""
echo "  aift-forge collab join forge-room steward --role planner"
echo "  aift-forge collab rooms"
echo ""
echo "Commit:"
echo "  git status"
echo "  git add ."
echo "  git commit -m \"Add Phase 11 autonomous multi-agent collaboration\""
echo "  git push origin main"
