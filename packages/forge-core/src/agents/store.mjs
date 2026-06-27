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
