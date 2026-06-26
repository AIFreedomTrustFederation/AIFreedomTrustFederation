import { existsSync } from "node:fs";
import { join } from "node:path";

export const FEDERATION_REPOSITORIES = [
  {
    name: "AIFT-Forge",
    role: "Federation runtime, SDK, CLI, templates, agents, and shared infrastructure"
  },
  {
    name: "BookSmith-Federation-OS",
    role: "User-facing web operating system and knowledge desktop"
  },
  {
    name: "booksmith-ai",
    role: "Publishing engine, manuscript tooling, figures, citations, proofing, and release pipeline"
  },
  {
    name: "AI-Freedom-Trust",
    role: "Constitution, doctrine, governance, trust principles, and alignment"
  },
  {
    name: "Aether_Coin_biozonecurrency",
    role: "Federation economy, accounting, treasury, wallet, and settlement protocol"
  }
];

export function inspectFederationRepositories(aiftRoot) {
  return FEDERATION_REPOSITORIES.map((repo) => {
    const path = join(aiftRoot, repo.name);

    return {
      ...repo,
      path,
      exists: existsSync(path),
      hasGit: existsSync(join(path, ".git")),
      hasPackageJson: existsSync(join(path, "package.json")),
      hasReadme: existsSync(join(path, "README.md"))
    };
  });
}
