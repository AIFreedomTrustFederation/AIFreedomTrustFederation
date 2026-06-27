import {
  createEdge,
  createObservation,
  upsertNode
} from "./store.mjs";

export function importForgeRecords(paths, records = []) {
  const imported = {
    nodes: 0,
    edges: 0,
    observations: 0
  };

  for (const record of records) {
    if (!record || typeof record !== "object") continue;

    if (record.schema === "aift.forge.agent.v1") {
      upsertNode(paths, {
        id: `agent:${record.id}`,
        type: "agent",
        label: record.label ?? record.id,
        summary: record.systemPrompt ?? record.role ?? "",
        tags: ["agent", record.role].filter(Boolean),
        sourceRefs: [`.forge/agents/${record.id}.json`],
        metadata: {
          model: record.model,
          providerId: record.providerId
        }
      });
      imported.nodes += 1;
    }

    if (record.schema === "aift.forge.workflow.v1") {
      upsertNode(paths, {
        id: `workflow:${record.id}`,
        type: "workflow",
        label: record.title ?? record.id,
        summary: record.description ?? "",
        tags: ["workflow"],
        sourceRefs: [`.forge/workflows/${record.id}.json`],
        metadata: {
          steps: record.steps?.length ?? 0
        }
      });
      imported.nodes += 1;
    }

    if (record.schema === "aift.forge.team.v1") {
      upsertNode(paths, {
        id: `team:${record.id}`,
        type: "team",
        label: record.title ?? record.id,
        summary: record.description ?? "",
        tags: ["team", "collaboration"],
        sourceRefs: [`.forge/teams/${record.id}.json`],
        metadata: {
          members: record.members?.length ?? 0
        }
      });
      imported.nodes += 1;

      for (const member of record.members ?? []) {
        createEdge(paths, {
          from: `team:${record.id}`,
          to: `agent:${member.agentId}`,
          relation: "has-member",
          label: "has member",
          metadata: {
            role: member.role
          }
        });
        imported.edges += 1;
      }
    }

    if (record.schema === "aift.forge.local-model.v1") {
      upsertNode(paths, {
        id: `model:${record.id}`,
        type: "model",
        label: record.name ?? record.id,
        summary: `Local model from provider ${record.providerId ?? "unknown"}`,
        tags: ["model", ...(record.tags ?? [])],
        sourceRefs: [`.forge/models/${record.id}.json`],
        metadata: {
          providerId: record.providerId,
          capabilities: record.capabilities
        }
      });
      imported.nodes += 1;
    }

    if (record.schema === "aift.forge.federation-node.v1") {
      upsertNode(paths, {
        id: `federation-node:${record.id}`,
        type: "federation-node",
        label: record.label ?? record.id,
        summary: record.trustBoundary ?? "",
        tags: ["federation", "node"],
        sourceRefs: [".forge/federation/node.json"],
        metadata: {
          capabilities: record.capabilities
        }
      });
      imported.nodes += 1;
    }

    if (record.schema === "aift.forge.knowledge-observation.v1") {
      createObservation(paths, record);
      imported.observations += 1;
    }
  }

  return imported;
}
