export const agentBackends = [
  {
    id: "manual-agent",
    label: "Manual AI Agent",
    mode: "packet",
    enabled: true,
    priority: 10,
    capabilities: [
      "react",
      "tsx",
      "typescript",
      "repo-discovery",
      "todo-resolution",
      "local-first",
      "patch-review"
    ]
  },
  {
    id: "termux-local",
    label: "Termux Local Operator",
    mode: "local",
    enabled: true,
    priority: 5,
    capabilities: [
      "shell",
      "git",
      "node",
      "npm",
      "pnpm",
      "file-write"
    ]
  },
  {
    id: "ollama-local",
    label: "Ollama Local Model",
    mode: "future",
    enabled: false,
    priority: 3,
    capabilities: [
      "local-llm",
      "code-generation",
      "offline-ai"
    ]
  },
  {
    id: "openai-compatible",
    label: "OpenAI-compatible Endpoint",
    mode: "future",
    enabled: false,
    priority: 2,
    capabilities: [
      "remote-llm",
      "code-generation",
      "patch-generation"
    ]
  }
];

export function listAgentBackends() {
  return [...agentBackends].sort((a, b) => b.priority - a.priority);
}

export function enabledAgentBackends() {
  return listAgentBackends().filter((backend) => backend.enabled);
}

export function chooseAgentBackend(required = []) {
  const enabled = enabledAgentBackends();

  return enabled.find((backend) =>
    required.every((capability) => backend.capabilities.includes(capability))
  ) ?? enabled[0] ?? null;
}
