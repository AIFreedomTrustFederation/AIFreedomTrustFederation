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
