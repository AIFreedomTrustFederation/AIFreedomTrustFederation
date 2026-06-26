import { buildDockManager } from "./dock-manager.mjs";
import { buildAppRegistry } from "./app-registry.mjs";
import { buildLauncherRouting } from "./launcher-routing.mjs";
import { buildSettingsSurface } from "./settings-surface.mjs";

export const engineers = {
  "dock-manager": buildDockManager,
  "app-registry": buildAppRegistry,
  "launcher-routing": buildLauncherRouting,
  "settings-surface": buildSettingsSurface
};

export function getEngineer(taskId) {
  return engineers[taskId] ?? null;
}

export function listEngineers() {
  return Object.keys(engineers).sort();
}
