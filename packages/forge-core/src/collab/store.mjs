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
