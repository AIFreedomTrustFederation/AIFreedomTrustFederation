import { getForgePaths } from "../lib/paths.mjs";
import {
  modelInventory,
  routeChat,
  routeCompletion,
  activeProvider
} from "../providers/router.mjs";

export function getRuntimePaths() {
  return getForgePaths(import.meta.url);
}

export async function discoverModels(paths = getRuntimePaths()) {
  return modelInventory(paths);
}

export async function getActiveProvider(paths = getRuntimePaths()) {
  return activeProvider(paths);
}

export async function askLocalAI({
  model = process.env.FORGE_MODEL ?? "llama3.2",
  prompt,
  system,
  mode = "chat"
}) {
  const paths = getRuntimePaths();

  if (!prompt) {
    return {
      ok: false,
      error: "Prompt is required."
    };
  }

  if (mode === "completion") {
    return routeCompletion(paths, {
      model,
      prompt,
      stream: false
    });
  }

  const messages = [];

  if (system) {
    messages.push({
      role: "system",
      content: system
    });
  }

  messages.push({
    role: "user",
    content: prompt
  });

  return routeChat(paths, {
    model,
    messages,
    stream: false
  });
}

export function extractText(result) {
  const body = result?.body;

  return body?.message?.content ??
    body?.response ??
    body?.choices?.[0]?.message?.content ??
    body?.choices?.[0]?.text ??
    JSON.stringify(body, null, 2);
}
