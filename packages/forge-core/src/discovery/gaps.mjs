function taskFromMissingImport(item) {
  const clean = item.specifier.replace(/^(\.\/|\.\.\/)+/, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = `missing-module-${clean || "unknown"}`.toLowerCase();

  return {
    id,
    title: `Create missing module for ${item.specifier}`,
    status: "ready",
    dependsOn: [],
    files: item.possibleTargets.slice(0, 1),
    source: "missing-import",
    evidence: {
      importedBy: item.source,
      specifier: item.specifier
    }
  };
}

function taskFromTodo(todo, index) {
  const clean = todo.file.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

  return {
    id: `resolve-todo-${clean}-${index + 1}`,
    title: `Resolve TODOs in ${todo.file}`,
    status: "queued",
    dependsOn: [],
    files: [todo.file],
    source: "todo",
    evidence: {
      file: todo.file,
      hints: todo.hints
    }
  };
}

export function detectGaps(graph) {
  const tasks = [];

  for (const item of graph.missingImports.slice(0, 10)) {
    tasks.push(taskFromMissingImport(item));
  }

  for (const [index, todo] of graph.todos.slice(0, 10).entries()) {
    tasks.push(taskFromTodo(todo, index));
  }

  if (tasks.length) {
    tasks[0].status = "ready";
    for (const task of tasks.slice(1)) {
      if (task.status !== "complete") task.status = "queued";
    }
  }

  return tasks;
}
