export const backlogItems = [
  {
    id: "repository-generator",
    title: "Repository Generator",
    priority: 1,
    category: "generator",
    description: "Generate federation repository scaffolds with manifests, README, package metadata, and registration hooks.",
    command: "aift-forge generate command repo",
    files: [
      "packages/forge-core/src/commands/repo.mjs"
    ],
    dependsOn: [
      "command-registry",
      "workspace-scan"
    ]
  },
  {
    id: "event-generator",
    title: "Event Generator",
    priority: 1,
    category: "generator",
    description: "Generate event models for human approval events, build records, sync events, and provenance trails.",
    command: "aift-forge generate model ApprovalEvent",
    files: [
      "packages/forge-core/src/models/approval-event.mjs"
    ],
    dependsOn: [
      "model-generator"
    ]
  },
  {
    id: "store-generator",
    title: "Store Generator",
    priority: 1,
    category: "generator",
    description: "Generate local-first store modules for workspace state, cache files, and registry records.",
    command: "aift-forge generate service WorkspaceStoreService",
    files: [
      "packages/forge-core/src/services/workspace-store-service.mjs"
    ],
    dependsOn: [
      "service-generator",
      "workspace-scan"
    ]
  },
  {
    id: "api-generator",
    title: "API Generator",
    priority: 2,
    category: "generator",
    description: "Generate API route scaffolds that expose Forge Core services through forge-api and future desktop clients.",
    command: "aift-forge generate command api",
    files: [
      "packages/forge-core/src/commands/api.mjs"
    ],
    dependsOn: [
      "command-generator",
      "command-registry"
    ]
  },
  {
    id: "agent-generator",
    title: "Agent Generator",
    priority: 2,
    category: "agent",
    description: "Generate agent definition files under agents/ with role, scope, permissions, and approval boundaries.",
    command: "aift-forge generate command agent",
    files: [
      "packages/forge-core/src/commands/agent.mjs"
    ],
    dependsOn: [
      "command-generator",
      "command-registry"
    ]
  },
  {
    id: "workspace-cache",
    title: "Workspace Cache",
    priority: 2,
    category: "workspace",
    description: "Persist workspace scans into .forge/workspace.json for fast repeated federation inspection.",
    command: "aift-forge generate service WorkspaceCacheService",
    files: [
      "packages/forge-core/src/services/workspace-cache-service.mjs"
    ],
    dependsOn: [
      "workspace-scan",
      "service-generator"
    ]
  },
  {
    id: "task-engine",
    title: "Task Engine",
    priority: 3,
    category: "planning",
    description: "Load roadmap files, track task completion, recommend next work, and later support approved execution.",
    command: "aift-forge generate command task",
    files: [
      "packages/forge-core/src/commands/task.mjs"
    ],
    dependsOn: [
      "plan-command",
      "command-registry"
    ]
  },
  {
    id: "evolve-command",
    title: "Evolve Command",
    priority: 4,
    category: "planning",
    description: "Read backlog and roadmap state, propose the next architectural task, and ask for approval before generation.",
    command: "aift-forge generate command evolve",
    files: [
      "packages/forge-core/src/commands/evolve.mjs"
    ],
    dependsOn: [
      "backlog-command",
      "task-engine"
    ]
  }
];

export const completedCapabilities = [
  "workspace-discovery",
  "manifest-loader",
  "doctor-command",
  "manifest-command",
  "federation-graph",
  "command-generator",
  "service-generator",
  "model-generator",
  "package-generator",
  "workspace-scan",
  "command-registry",
  "plan-command"
];
