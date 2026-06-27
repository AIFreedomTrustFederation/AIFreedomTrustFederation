import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { searchKnowledge } from "../knowledge/indexer.mjs";

function safeLimit(value, fallback = 50) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(number, 500);
}

function listFiles(root, dir = ".", out = [], limit = 200) {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return out;

  for (const name of readdirSync(absolute)) {
    if (out.length >= limit) break;
    if (["node_modules", ".git"].includes(name)) continue;

    const full = join(absolute, name);
    const rel = relative(root, full);

    try {
      const stat = statSync(full);

      if (stat.isDirectory()) {
        out.push(`${rel}/`);
        listFiles(root, rel, out, limit);
      } else {
        out.push(rel);
      }
    } catch {
      // ignore inaccessible files
    }
  }

  return out;
}

export const TOOL_DEFINITIONS = [
  {
    id: "repo.status",
    title: "Repository Status",
    description: "Return current repository package and file overview.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "repo.files",
    title: "Repository Files",
    description: "List repository files.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "repo.read",
    title: "Read File",
    description: "Read a local repository file.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "git.status",
    title: "Git Status",
    description: "Run git status --short.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "git.diff",
    title: "Git Diff",
    description: "Run git diff --stat.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "git.log",
    title: "Git Log",
    description: "Show recent git commits.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "knowledge.search",
    title: "Knowledge Search",
    description: "Search local Forge knowledge graph.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "knowledge.status",
    title: "Knowledge Status",
    description: "Return local knowledge graph counts.",
    risk: "read",
    requiresApproval: false
  },
  {
    id: "shell.exec",
    title: "Shell Exec",
    description: "Run a local shell command. Disabled by default.",
    risk: "write",
    requiresApproval: true
  }
];

export function listTools() {
  return TOOL_DEFINITIONS;
}

export function readToolDefinition(id) {
  return TOOL_DEFINITIONS.find((tool) => tool.id === id) ?? null;
}

export async function executeTool(paths, toolId, input = {}) {
  if (toolId === "repo.status") {
    return {
      ok: true,
      output: {
        repoRoot: paths.repoRoot,
        hasPackageJson: existsSync(join(paths.repoRoot, "package.json")),
        hasForgeDir: existsSync(join(paths.repoRoot, ".forge"))
      }
    };
  }

  if (toolId === "repo.files") {
    return {
      ok: true,
      output: {
        files: listFiles(paths.repoRoot, input.dir ?? ".", [], safeLimit(input.limit, 100))
      }
    };
  }

  if (toolId === "repo.read") {
    const file = input.file;
    if (!file) return { ok: false, error: "file is required" };

    const absolute = join(paths.repoRoot, file);

    if (!absolute.startsWith(paths.repoRoot)) {
      return { ok: false, error: "file must stay inside repo root" };
    }

    if (!existsSync(absolute)) {
      return { ok: false, error: `file not found: ${file}` };
    }

    return {
      ok: true,
      output: {
        file,
        text: readFileSync(absolute, "utf8").slice(0, safeLimit(input.maxChars, 20000))
      }
    };
  }

  if (toolId === "git.status") {
    const result = spawnSync("git", ["status", "--short"], {
      cwd: paths.repoRoot,
      encoding: "utf8"
    });

    return {
      ok: result.status === 0,
      output: result.stdout,
      error: result.stderr || null
    };
  }

  if (toolId === "git.diff") {
    const result = spawnSync("git", ["diff", "--stat"], {
      cwd: paths.repoRoot,
      encoding: "utf8"
    });

    return {
      ok: result.status === 0,
      output: result.stdout,
      error: result.stderr || null
    };
  }

  if (toolId === "git.log") {
    const result = spawnSync("git", ["log", "--oneline", `-${safeLimit(input.limit, 10)}`], {
      cwd: paths.repoRoot,
      encoding: "utf8"
    });

    return {
      ok: result.status === 0,
      output: result.stdout,
      error: result.stderr || null
    };
  }

  if (toolId === "knowledge.search") {
    const query = input.query ?? "";

    return {
      ok: true,
      output: {
        query,
        results: searchKnowledge(paths, query, { limit: safeLimit(input.limit, 10) })
      }
    };
  }

  if (toolId === "knowledge.status") {
    const { listNodes, listEdges, listObservations } = await import("../knowledge/store.mjs");

    return {
      ok: true,
      output: {
        nodes: listNodes(paths).length,
        edges: listEdges(paths).length,
        observations: listObservations(paths).length
      }
    };
  }

  if (toolId === "shell.exec") {
    const command = input.command;

    if (!command) return { ok: false, error: "command is required" };

    const result = spawnSync(command, {
      cwd: paths.repoRoot,
      encoding: "utf8",
      shell: true,
      timeout: 30000
    });

    return {
      ok: result.status === 0,
      output: result.stdout,
      error: result.stderr || null
    };
  }

  return {
    ok: false,
    error: `Unknown tool: ${toolId}`
  };
}
