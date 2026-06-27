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
