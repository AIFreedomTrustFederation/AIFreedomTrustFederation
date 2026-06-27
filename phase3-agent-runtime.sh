#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

echo "🤖 AIFT-Forge Phase 3: Agent Runtime"

mkdir -p packages/forge-core/src/agents
mkdir -p packages/forge-core/src/commands
mkdir -p docs
mkdir -p scripts
mkdir -p .forge/agents
mkdir -p .forge/conversations
mkdir -p .forge/tasks

cat > packages/forge-core/src/agents/store.mjs <<'JS'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function agentDir(paths) {
  return join(paths.repoRoot, ".forge", "agents");
}

export function conversationDir(paths) {
  return join(paths.repoRoot, ".forge", "conversations");
}

export function taskDir(paths) {
  return join(paths.repoRoot, ".forge", "tasks");
}

export function ensureAgentStore(paths) {
  mkdirSync(agentDir(paths), { recursive: true });
  mkdirSync(conversationDir(paths), { recursive: true });
  mkdirSync(taskDir(paths), { recursive: true });
}

export function agentFile(paths, id) {
  return join(agentDir(paths), `${id}.json`);
}

export function conversationFile(paths, id) {
  return join(conversationDir(paths), `${id}.json`);
}

export function taskFile(paths, id) {
  return join(taskDir(paths), `${id}.json`);
}

export function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function createAgent(paths, agent) {
  ensureAgentStore(paths);

  if (!agent.id) throw new Error("Agent id is required.");

  const next = {
    schema: "aift.forge.agent.v1",
    id: agent.id,
    label: agent.label ?? agent.id,
    role: agent.role ?? "local-ai-agent",
    model: agent.model ?? process.env.FORGE_MODEL ?? "llama3.2",
    providerId: agent.providerId ?? null,
    systemPrompt: agent.systemPrompt ?? "You are a local-first AIFT-Forge agent. Respect user sovereignty, privacy, inspectability, and no cloud fallback.",
    tools: agent.tools ?? [],
    permissions: agent.permissions ?? {
      filesystem: "read",
      git: "read",
      network: "local-only",
      write: "explicit-approval"
    },
    memory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(agentFile(paths, next.id), next);
  return next;
}

export function readAgent(paths, id) {
  ensureAgentStore(paths);

  const file = agentFile(paths, id);
  if (!existsSync(file)) return null;

  return readJson(file);
}

export function listAgents(paths) {
  ensureAgentStore(paths);

  return readdirSync(agentDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(agentDir(paths), file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function updateAgent(paths, id, patch) {
  const existing = readAgent(paths, id);
  if (!existing) throw new Error(`Agent not found: ${id}`);

  const next = {
    ...existing,
    ...patch,
    id,
    updatedAt: new Date().toISOString()
  };

  writeJson(agentFile(paths, id), next);
  return next;
}

export function remember(paths, id, entry) {
  const agent = readAgent(paths, id);
  if (!agent) throw new Error(`Agent not found: ${id}`);

  const memory = Array.isArray(agent.memory) ? agent.memory : [];

  memory.push({
    id: `mem-${Date.now()}`,
    content: entry,
    createdAt: new Date().toISOString()
  });

  return updateAgent(paths, id, { memory });
}

export function createConversation(paths, value) {
  ensureAgentStore(paths);

  const id = value.id ?? `conv-${Date.now()}`;

  const next = {
    schema: "aift.forge.conversation.v1",
    id,
    agentId: value.agentId,
    model: value.model,
    providerId: value.providerId ?? null,
    messages: value.messages ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(conversationFile(paths, id), next);
  return next;
}

export function appendConversation(paths, id, message) {
  const file = conversationFile(paths, id);
  const existing = existsSync(file)
    ? readJson(file)
    : {
        schema: "aift.forge.conversation.v1",
        id,
        messages: [],
        createdAt: new Date().toISOString()
      };

  existing.messages.push({
    ...message,
    createdAt: new Date().toISOString()
  });

  existing.updatedAt = new Date().toISOString();

  writeJson(file, existing);
  return existing;
}

export function createTask(paths, value) {
  ensureAgentStore(paths);

  const id = value.id ?? `task-${Date.now()}`;

  const next = {
    schema: "aift.forge.task.v1",
    id,
    agentId: value.agentId,
    title: value.title ?? "Untitled task",
    prompt: value.prompt ?? "",
    status: value.status ?? "open",
    result: value.result ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeJson(taskFile(paths, id), next);
  return next;
}

export function listTasks(paths) {
  ensureAgentStore(paths);

  return readdirSync(taskDir(paths))
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(join(taskDir(paths), file)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function updateTask(paths, id, patch) {
  const file = taskFile(paths, id);
  if (!existsSync(file)) throw new Error(`Task not found: ${id}`);

  const existing = readJson(file);

  const next = {
    ...existing,
    ...patch,
    id,
    updatedAt: new Date().toISOString()
  };

  writeJson(file, next);
  return next;
}
JS

cat > packages/forge-core/src/agents/runtime.mjs <<'JS'
import { askLocalAI, extractText } from "../ai/runtime.mjs";
import {
  appendConversation,
  createConversation,
  createTask,
  readAgent,
  remember,
  updateTask
} from "./store.mjs";

export async function runAgent(paths, agentId, prompt, options = {}) {
  const agent = readAgent(paths, agentId);
  if (!agent) {
    return {
      ok: false,
      error: `Agent not found: ${agentId}`
    };
  }

  const conversation = createConversation(paths, {
    agentId,
    model: agent.model,
    providerId: agent.providerId,
    messages: [
      {
        role: "system",
        content: agent.systemPrompt
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const result = await askLocalAI({
    model: options.model ?? agent.model,
    system: agent.systemPrompt,
    prompt,
    mode: options.mode ?? "chat"
  });

  if (!result.ok) {
    appendConversation(paths, conversation.id, {
      role: "assistant",
      content: result.error ?? "Agent request failed.",
      error: true
    });

    return {
      ok: false,
      error: result.error,
      conversationId: conversation.id
    };
  }

  const text = extractText(result);

  appendConversation(paths, conversation.id, {
    role: "assistant",
    content: text
  });

  return {
    ok: true,
    agent,
    conversationId: conversation.id,
    text
  };
}

export async function runAgentTask(paths, agentId, title, prompt) {
  const task = createTask(paths, {
    agentId,
    title,
    prompt,
    status: "running"
  });

  const result = await runAgent(paths, agentId, prompt);

  updateTask(paths, task.id, {
    status: result.ok ? "complete" : "failed",
    result: result.ok ? result.text : result.error,
    conversationId: result.conversationId
  });

  return {
    ...result,
    taskId: task.id
  };
}

export function rememberForAgent(paths, agentId, content) {
  return remember(paths, agentId, content);
}
JS

cat > packages/forge-core/src/commands/agent.mjs <<'JS'
import { getForgePaths } from "../lib/paths.mjs";
import {
  createAgent,
  listAgents,
  listTasks,
  readAgent,
  remember
} from "../agents/store.mjs";
import { runAgent, runAgentTask } from "../agents/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function remainingText(args, skip = []) {
  return args
    .filter((arg, index) => {
      const previous = args[index - 1];
      return !skip.includes(arg) && !skip.includes(previous);
    })
    .join(" ")
    .trim();
}

export default async function agent(args = []) {
  const action = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);

  if (action === "create") {
    const id = args[1];
    const label = readFlag(args, "--label", id);
    const role = readFlag(args, "--role", "local-ai-agent");
    const model = readFlag(args, "--model", process.env.FORGE_MODEL ?? "llama3.2");

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge agent create steward --label \"Forge Steward\" --model llama3.2");
      return;
    }

    const created = createAgent(paths, {
      id,
      label,
      role,
      model
    });

    console.log("✅ Agent created");
    console.log(`id: ${created.id}`);
    console.log(`label: ${created.label}`);
    console.log(`model: ${created.model}`);
    return;
  }

  if (action === "list") {
    const agents = listAgents(paths);

    console.log("🤖 Forge Agents");
    console.log("");

    if (agents.length === 0) {
      console.log("No agents yet.");
      console.log("Create one:");
      console.log("  aift-forge agent create steward --label \"Forge Steward\"");
      return;
    }

    for (const agent of agents) {
      console.log(`✅ ${agent.id} — ${agent.label}`);
      console.log(`   role: ${agent.role}`);
      console.log(`   model: ${agent.model}`);
      console.log(`   memories: ${agent.memory?.length ?? 0}`);
    }

    return;
  }

  if (action === "show") {
    const id = args[1];
    const found = readAgent(paths, id);

    if (!found) {
      console.log(`❌ Agent not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(found, null, 2));
    return;
  }

  if (action === "remember") {
    const id = args[1];
    const content = args.slice(2).join(" ").trim();

    if (!id || !content) {
      console.log("Usage:");
      console.log("  aift-forge agent remember steward \"Always prefer local-first design.\"");
      return;
    }

    const updated = remember(paths, id, content);

    console.log("✅ Memory saved");
    console.log(`agent: ${updated.id}`);
    console.log(`memories: ${updated.memory.length}`);
    return;
  }

  if (action === "run") {
    const id = args[1];
    const prompt = args.slice(2).join(" ").trim();

    if (!id || !prompt) {
      console.log("Usage:");
      console.log("  aift-forge agent run steward \"Inspect the repo direction.\"");
      return;
    }

    const result = await runAgent(paths, id, prompt);

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      return;
    }

    console.log(result.text);
    console.log("");
    console.log(`conversation: ${result.conversationId}`);
    return;
  }

  if (action === "task") {
    const id = args[1];
    const title = readFlag(args, "--title", "Agent task");
    const prompt = remainingText(args.slice(2), ["--title"]);

    if (!id || !prompt) {
      console.log("Usage:");
      console.log("  aift-forge agent task steward --title \"Repo review\" \"Review the repo health.\"");
      return;
    }

    const result = await runAgentTask(paths, id, title, prompt);

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      console.log(`task: ${result.taskId}`);
      return;
    }

    console.log(result.text);
    console.log("");
    console.log(`task: ${result.taskId}`);
    console.log(`conversation: ${result.conversationId}`);
    return;
  }

  if (action === "tasks") {
    const tasks = listTasks(paths);

    console.log("📋 Forge Agent Tasks");
    console.log("");

    if (tasks.length === 0) {
      console.log("No tasks yet.");
      return;
    }

    for (const task of tasks) {
      console.log(`${task.status === "complete" ? "✅" : "🟡"} ${task.id} — ${task.title}`);
      console.log(`   agent: ${task.agentId}`);
      console.log(`   status: ${task.status}`);
    }

    return;
  }

  console.log("Forge Agent Runtime");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge agent list");
  console.log("  aift-forge agent create steward --label \"Forge Steward\"");
  console.log("  aift-forge agent show steward");
  console.log("  aift-forge agent remember steward \"Always prefer local-first design.\"");
  console.log("  aift-forge agent run steward \"What should we build next?\"");
  console.log("  aift-forge agent task steward --title \"Repo review\" \"Review the repo.\"");
  console.log("  aift-forge agent tasks");
}
JS

cat > scripts/aift-agent-runtime-smoke.mjs <<'JS'
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
JS

cat > docs/AGENT_RUNTIME_PHASE_3.md <<'MD'
# AIFT-Forge Agent Runtime Phase 3

Phase 3 turns local AI from a stateless command into persistent Forge agents.

## Agent Object

Each agent is stored as JSON under:

    .forge/agents/

An agent contains:

- identity
- label
- role
- model
- provider preference
- system prompt
- tools
- permissions
- memory

## Conversations

Agent conversations are stored under:

    .forge/conversations/

## Tasks

Agent tasks are stored under:

    .forge/tasks/

## Commands

Create an agent:

    aift-forge agent create steward --label "Forge Steward"

List agents:

    aift-forge agent list

Save memory:

    aift-forge agent remember steward "Always prefer local-first design."

Run an agent:

    aift-forge agent run steward "What should we build next?"

Create and run a task:

    aift-forge agent task steward --title "Repo review" "Review the repo direction."

List tasks:

    aift-forge agent tasks

## Governance

Agents follow AIFT-Forge policy:

- local-first
- inspectable
- no cloud fallback
- explicit write permissions
- user-owned memory
- JSON records stored inside the local Forge workspace
MD

node --check packages/forge-core/src/agents/store.mjs
node --check packages/forge-core/src/agents/runtime.mjs
node --check packages/forge-core/src/commands/agent.mjs
node --check scripts/aift-agent-runtime-smoke.mjs
node scripts/aift-agent-runtime-smoke.mjs

echo ""
echo "✅ Phase 3 Agent Runtime complete."
echo ""
echo "IMPORTANT:"
echo "Wire the new command into your aift-forge command router:"
echo "  agent -> packages/forge-core/src/commands/agent.mjs"
echo ""
echo "Then test:"
echo "  aift-forge agent create steward --label \"Forge Steward\""
echo "  aift-forge agent list"
echo "  aift-forge agent remember steward \"Always prefer local-first design.\""
echo ""
echo "Commit:"
echo "  git add ."
echo "  git commit -m \"Add Phase 3 persistent agent runtime\""
echo "  git push origin main"
