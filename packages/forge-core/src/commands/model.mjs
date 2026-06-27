import { getForgePaths } from "../lib/paths.mjs";
import {
  createDefaultRoutes,
  createRoute,
  listModelRuns,
  listModels,
  listRoutes,
  readModel,
  readRoute,
  upsertModel
} from "../models/store.mjs";
import {
  refreshModelRegistry,
  registerManualModel,
  runModelRoute,
  selectModelForRoute
} from "../models/orchestrator.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function csv(value, fallback = []) {
  if (!value) return fallback;

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function model(args = []) {
  const action = args[0] ?? "list";
  const paths = getForgePaths(import.meta.url);

  if (action === "init") {
    const routes = createDefaultRoutes(paths);

    console.log("✅ Model orchestration initialized");
    console.log(`created routes: ${routes.length}`);
    return;
  }

  if (action === "refresh") {
    const models = await refreshModelRegistry(paths);

    console.log("✅ Model registry refreshed");
    console.log(`models discovered: ${models.length}`);
    return;
  }

  if (action === "register") {
    const id = args[1];
    const name = readFlag(args, "--name", id);
    const providerId = readFlag(args, "--provider");
    const providerType = readFlag(args, "--type", "ollama");
    const endpoint = readFlag(args, "--endpoint", null);
    const capabilities = csv(readFlag(args, "--capabilities", "chat,completion"));
    const tags = csv(readFlag(args, "--tags", "general"));
    const priority = Number(readFlag(args, "--priority", "50"));

    if (!id || !providerId) {
      console.log("Usage:");
      console.log("  aift-forge model register llama-local --name llama3.2 --provider ollama-localhost --type ollama --tags chat,planner");
      return;
    }

    const created = registerManualModel(paths, {
      id,
      name,
      providerId,
      providerType,
      endpoint,
      capabilities,
      tags,
      priority
    });

    console.log("✅ Model registered");
    console.log(`id: ${created.id}`);
    console.log(`name: ${created.name}`);
    console.log(`provider: ${created.providerId}`);
    return;
  }

  if (action === "list") {
    const models = listModels(paths);

    console.log("🧠 Local Model Registry");
    console.log("");

    if (models.length === 0) {
      console.log("No models registered yet.");
      console.log("Run:");
      console.log("  aift-forge model refresh");
      return;
    }

    for (const item of models) {
      console.log(`${item.enabled ? "✅" : "⬜"} ${item.id}`);
      console.log(`   name: ${item.name}`);
      console.log(`   provider: ${item.providerId ?? "none"}`);
      console.log(`   capabilities: ${(item.capabilities ?? []).join(", ")}`);
      console.log(`   tags: ${(item.tags ?? []).join(", ")}`);
      console.log(`   priority: ${item.priority}`);
    }

    return;
  }

  if (action === "show") {
    const id = args[1];
    const item = readModel(paths, id);

    if (!item) {
      console.log(`❌ Model not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(item, null, 2));
    return;
  }

  if (action === "route-create") {
    const id = args[1];
    const capability = readFlag(args, "--capability", id);
    const preferredModels = csv(readFlag(args, "--preferred", ""));
    const fallbackModels = csv(readFlag(args, "--fallback", ""));
    const requiredTags = csv(readFlag(args, "--tags", ""));

    if (!id) {
      console.log("Usage:");
      console.log("  aift-forge model route-create planner --capability chat --tags planner");
      return;
    }

    const route = createRoute(paths, {
      id,
      capability,
      preferredModels,
      fallbackModels,
      requiredTags
    });

    console.log("✅ Model route created");
    console.log(`id: ${route.id}`);
    console.log(`capability: ${route.capability}`);
    return;
  }

  if (action === "routes") {
    const routes = listRoutes(paths);

    console.log("🧭 Model Routes");
    console.log("");

    if (routes.length === 0) {
      console.log("No routes yet.");
      console.log("Run:");
      console.log("  aift-forge model init");
      return;
    }

    for (const route of routes) {
      const selection = selectModelForRoute(paths, route.id);

      console.log(`${route.enabled ? "✅" : "⬜"} ${route.id} — ${route.label}`);
      console.log(`   capability: ${route.capability}`);
      console.log(`   tags: ${(route.requiredTags ?? []).join(", ") || "none"}`);
      console.log(`   selected: ${selection.ok ? selection.model.id : "none"}`);
    }

    return;
  }

  if (action === "route-show") {
    const id = args[1];
    const route = readRoute(paths, id);

    if (!route) {
      console.log(`❌ Route not found: ${id}`);
      return;
    }

    console.log(JSON.stringify(route, null, 2));
    return;
  }

  if (action === "select") {
    const id = args[1] ?? "chat";
    const selection = selectModelForRoute(paths, id);

    if (!selection.ok) {
      console.log(`❌ ${selection.error}`);
      return;
    }

    console.log("✅ Model selected");
    console.log(`route: ${selection.route.id}`);
    console.log(`model: ${selection.model.id}`);
    console.log(`provider: ${selection.model.providerId}`);
    console.log(`reason: ${selection.reason}`);
    return;
  }

  if (action === "run") {
    const routeId = args[1] ?? "chat";
    const prompt = args.slice(2).join(" ").trim();

    if (!prompt) {
      console.log("Usage:");
      console.log("  aift-forge model run chat \"Say hello\"");
      console.log("  aift-forge model run planner \"Plan the next Forge milestone\"");
      return;
    }

    const result = await runModelRoute(paths, routeId, { prompt });

    if (!result.ok) {
      console.log(`❌ ${result.error}`);
      if (result.runId) console.log(`run: ${result.runId}`);
      return;
    }

    console.log(result.text);
    console.log("");
    console.log(`run: ${result.runId}`);
    console.log(`model: ${result.modelId}`);
    return;
  }

  if (action === "runs") {
    const runs = listModelRuns(paths);

    console.log("📜 Model Runs");
    console.log("");

    if (runs.length === 0) {
      console.log("No model runs yet.");
      return;
    }

    for (const run of runs) {
      console.log(`${run.status === "complete" ? "✅" : "🟡"} ${run.id}`);
      console.log(`   route: ${run.routeId}`);
      console.log(`   model: ${run.modelId}`);
      console.log(`   status: ${run.status}`);
    }

    return;
  }

  console.log("Forge Local Model Orchestration");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge model init");
  console.log("  aift-forge model refresh");
  console.log("  aift-forge model register llama-local --name llama3.2 --provider ollama-localhost --type ollama --tags chat,planner");
  console.log("  aift-forge model list");
  console.log("  aift-forge model routes");
  console.log("  aift-forge model select chat");
  console.log("  aift-forge model run chat \"Say hello\"");
  console.log("  aift-forge model runs");
}
