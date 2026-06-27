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
