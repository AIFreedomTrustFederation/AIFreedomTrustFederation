import { join } from "node:path";
import { buildRepositoryGraph } from "./graph.mjs";
import { detectGaps } from "./gaps.mjs";
import { saveMission } from "../mission/state.mjs";

export function buildDiscoveryMission(paths, targetRepository = "BookSmith-Federation-OS") {
  const targetRoot = join(paths.aiftRoot, targetRepository);
  const graph = buildRepositoryGraph(targetRoot);
  const tasks = detectGaps(graph);

  if (!tasks.length) return null;

  return {
    id: `mission-${targetRepository.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-graph-${Date.now()}`,
    title: `Graph-discovered ${targetRepository} Engineering Work`,
    targetRepository,
    authorityLevel: 2,
    state: "needs-review",
    risk: "medium",
    scope: tasks.map((task) => task.title),
    limits: {
      mayCreateFiles: true,
      mayModifyExistingUi: true,
      mayModifyExistingApi: false,
      mayDeleteFiles: false,
      mayTouchOtherRepositories: false,
      mayInstallDependencies: false,
      mayCommitAutomatically: false
    },
    tasks,
    progress: 0,
    approvals: [],
    events: [
      {
        type: "mission-generated-from-repository-graph",
        targetRepository,
        filesScanned: graph.files.length,
        missingImports: graph.missingImports.length,
        todos: graph.todos.length,
        at: new Date().toISOString()
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

export function saveDiscoveryMission(paths, targetRepository = "BookSmith-Federation-OS") {
  const mission = buildDiscoveryMission(paths, targetRepository);
  if (!mission) return null;
  return saveMission(paths.repoRoot, mission);
}
