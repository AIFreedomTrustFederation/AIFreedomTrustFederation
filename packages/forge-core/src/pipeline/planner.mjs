export function taskStatusMap(mission) {
  return new Map(mission.tasks.map((task) => [task.id, task.status]));
}

export function dependenciesMet(task, statusMap) {
  const deps = task.dependsOn ?? [];
  return deps.every((id) => statusMap.get(id) === "complete");
}

export function getReadyTasks(mission) {
  const statusMap = taskStatusMap(mission);

  return mission.tasks.filter((task) => {
    if (task.status !== "ready" && task.status !== "queued") return false;
    return dependenciesMet(task, statusMap);
  });
}

export function getBlockedTasks(mission) {
  const statusMap = taskStatusMap(mission);

  return mission.tasks.filter((task) => {
    if (task.status === "complete") return false;
    return !dependenciesMet(task, statusMap);
  });
}

export function selectNextTask(mission) {
  const ready = getReadyTasks(mission);

  return ready[0] ?? null;
}

export function normalizeTaskDependencies(mission) {
  const dependencyDefaults = {
    "dock-manager": ["window-manager"],
    "app-registry": ["window-manager"],
    "launcher-routing": ["app-registry", "dock-manager"],
    "settings-surface": ["window-manager"]
  };

  return {
    ...mission,
    tasks: mission.tasks.map((task) => ({
      ...task,
      dependsOn: task.dependsOn ?? dependencyDefaults[task.id] ?? []
    }))
  };
}
