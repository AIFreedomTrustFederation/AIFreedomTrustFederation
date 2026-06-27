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
