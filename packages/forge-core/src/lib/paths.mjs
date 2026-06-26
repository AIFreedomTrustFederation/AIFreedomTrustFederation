import { getForgeWorkspace } from "./workspace.mjs";

export function getForgePaths(importMetaUrl = import.meta.url) {
  return getForgeWorkspace(importMetaUrl);
}
