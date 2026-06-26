export const commandRegistry = [
  {
    name: "remember",
    description: "Show Forge memory state and current mission.",
    category: "memory",
    phase: "1",
    status: "active"
  },
  {
    name: "resume",
    description: "Resume from the last known Forge task.",
    category: "memory",
    phase: "1",
    status: "active"
  },
  {
    name: "next",
    description: "Show or approve the next Forge task.",
    category: "planning",
    phase: "1",
    status: "active"
  },
  {
    name: "work",
    description: "Start a guided Forge engineering session.",
    category: "orchestration",
    phase: "1",
    status: "active"
  },
  {
    name: "dashboard",
    description: "Show a federation-wide health dashboard.",
    category: "federation",
    phase: "1",
    status: "active"
  },
  {
    name: "doctor",
    description: "Check tools, paths, repositories, manifests, and AIFT-Forge structure.",
    category: "health",
    phase: "0",
    status: "active"
  },
  {
    name: "manifest",
    description: "Show AIFT Forge and root federation manifests.",
    category: "manifest",
    phase: "0",
    status: "active"
  },
  {
    name: "graph",
    description: "Show local federation repository topology.",
    category: "federation",
    phase: "0",
    status: "active"
  },
  {
    name: "plan",
    description: "Show Forge development progress and next recommended task.",
    category: "planning",
    phase: "0",
    status: "active"
  },
  {
    name: "workspace",
    description: "Scan or list the local federation workspace.",
    category: "workspace",
    phase: "1",
    status: "active"
  },
  {
    name: "generate",
    description: "Generate Forge commands, services, models, and packages.",
    category: "generator",
    phase: "0",
    status: "active"
  },
  {
    name: "verify",
    description: "Verify generated federation targets such as the BookSmith Web OS shell.",
    category: "verification",
    phase: "1",
    status: "active"
  },
  {
    name: "build",
    description: "Build federation targets such as the BookSmith Web OS shell.",
    category: "build",
    phase: "1",
    status: "active"
  },
  {
    name: "commands",
    description: "List registered Forge commands and metadata.",
    category: "registry",
    phase: "1",
    status: "active"
  }
];

export function getRegisteredCommands() {
  return commandRegistry.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function getCommandByName(name) {
  return commandRegistry.find((command) => command.name === name) ?? null;
}

export function getCommandsByCategory(category) {
  return getRegisteredCommands().filter((command) => command.category === category);
}

export function getCommandCategories() {
  return [...new Set(commandRegistry.map((command) => command.category))].sort();
}
