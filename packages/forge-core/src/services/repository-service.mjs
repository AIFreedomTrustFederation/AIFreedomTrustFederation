import { section, ok } from "../lib/logger.mjs";

export class RepositoryService {
  constructor(context = {}) {
    this.context = context;
  }

  describe() {
    return {
      name: "RepositoryService",
      phase: "generated",
      contextKeys: Object.keys(this.context)
    };
  }
}

export function createRepositoryService(context = {}) {
  return new RepositoryService(context);
}

export function runRepositoryService(context = {}) {
  section("RepositoryService");
  const service = createRepositoryService(context);
  ok("RepositoryService scaffold created.");
  return service.describe();
}
