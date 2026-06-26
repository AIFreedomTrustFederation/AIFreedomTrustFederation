import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function readDirs(path) {
  if (!existsSync(path)) return [];

  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function exists(path) {
  return existsSync(path);
}

export class WorkspaceService {
  constructor(context = {}) {
    this.context = context;
    this.aiftRoot = context.aiftRoot;
  }

  scanRepository(repoName) {
    const repoPath = join(this.aiftRoot, repoName);

    return {
      name: repoName,
      path: repoPath,
      exists: exists(repoPath),
      git: exists(join(repoPath, ".git")),
      readme: exists(join(repoPath, "README.md")),
      packageJson: exists(join(repoPath, "package.json")),
      apps: readDirs(join(repoPath, "apps")),
      packages: readDirs(join(repoPath, "packages")),
      agents: readDirs(join(repoPath, "agents")),
      docs: exists(join(repoPath, "docs"))
    };
  }

  scan(repoNames = []) {
    return {
      root: this.aiftRoot,
      repositories: repoNames.map((name) => this.scanRepository(name))
    };
  }
}

export function createWorkspaceService(context = {}) {
  return new WorkspaceService(context);
}
