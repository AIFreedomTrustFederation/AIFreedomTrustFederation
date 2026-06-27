import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";
import { createAgent, listAgents, readAgent, remember, createTask, listTasks } from "../packages/forge-core/src/agents/store.mjs";

const paths = { repoRoot: process.cwd() };

rmSync(".forge/agents/test-agent.json", { force: true });
rmSync(".forge/tasks/test-task.json", { force: true });

const agent = createAgent(paths, {
  id: "test-agent",
  label: "Test Agent",
  model: "test-model"
});

assert.equal(agent.id, "test-agent");
assert.equal(agent.label, "Test Agent");

const found = readAgent(paths, "test-agent");
assert.equal(found.id, "test-agent");

const updated = remember(paths, "test-agent", "Test memory");
assert.equal(updated.memory.length, 1);

const agents = listAgents(paths);
assert.ok(agents.some((item) => item.id === "test-agent"));

const task = createTask(paths, {
  id: "test-task",
  agentId: "test-agent",
  title: "Test task",
  prompt: "Test prompt"
});

assert.equal(task.id, "test-task");

const tasks = listTasks(paths);
assert.ok(tasks.some((item) => item.id === "test-task"));

console.log("✅ Agent runtime smoke test passed.");
