import { getForgePaths } from "../lib/paths.mjs";
import {
  activeProvider,
  configuredProviders,
  modelInventory,
  routeChat,
  routeCompletion
} from "../providers/router.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function readPrompt(args) {
  const promptIndex = args.indexOf("--prompt");
  if (promptIndex !== -1) return args.slice(promptIndex + 1).join(" ");

  return args.slice(1).join(" ");
}

export default async function ai(args = []) {
  const action = args[0] ?? "status";
  const paths = getForgePaths(import.meta.url);

  if (action === "status") {
    console.log("🧠 Forge AI Provider Router");
    console.log("");
    console.log("Policy:");
    console.log("✅ Local/private LAN only");
    console.log("✅ No API keys");
    console.log("✅ No cloud fallback");
    console.log("✅ Capability-routed provider adapters");
    console.log("");

    for (const provider of configuredProviders(paths)) {
      console.log(`${provider.enabled ? "✅" : "⬜"} ${provider.id}`);
      console.log(`   type: ${provider.type}`);
      console.log(`   endpoint: ${provider.endpoint}`);
      console.log(`   capabilities: ${provider.capabilities.join(", ")}`);
    }

    const active = await activeProvider(paths);

    console.log("");
    if (active) console.log(`✅ Active provider: ${active.id}`);
    else console.log("❌ No active local provider.");

    return;
  }

  if (action === "models") {
    const inventory = await modelInventory(paths);

    if (inventory.length === 0) {
      console.log("❌ No reachable local model providers.");
      return;
    }

    for (const item of inventory) {
      console.log(`${item.ok ? "✅" : "⚠️"} ${item.providerId}`);
      console.log(`   endpoint: ${item.endpoint}`);

      if (item.ok) {
        for (const model of item.models) {
          console.log(`   - ${model.name ?? model.id ?? JSON.stringify(model)}`);
        }
      } else {
        console.log(`   ${item.error ?? "model inventory failed"}`);
      }
    }

    return;
  }

  if (action === "chat") {
    const model = readFlag(args, "--model", process.env.FORGE_MODEL ?? "llama3.2");
    const prompt = readPrompt(args);

    if (!prompt) {
      console.log("Usage:");
      console.log("  aift-forge ai chat --model llama3.2 --prompt Say hello");
      return;
    }

    const result = await routeChat(paths, {
      model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false
    });

    if (!result.ok) {
      console.log(`❌ ${result.error ?? "chat request failed"}`);
      return;
    }

    const body = result.body;
    console.log(body?.message?.content ?? body?.choices?.[0]?.message?.content ?? JSON.stringify(body, null, 2));
    return;
  }

  if (action === "complete") {
    const model = readFlag(args, "--model", process.env.FORGE_MODEL ?? "llama3.2");
    const prompt = readPrompt(args);

    if (!prompt) {
      console.log("Usage:");
      console.log("  aift-forge ai complete --model llama3.2 --prompt Once upon a time");
      return;
    }

    const result = await routeCompletion(paths, {
      model,
      prompt,
      stream: false
    });

    if (!result.ok) {
      console.log(`❌ ${result.error ?? "completion request failed"}`);
      return;
    }

    const body = result.body;
    console.log(body?.response ?? body?.choices?.[0]?.text ?? JSON.stringify(body, null, 2));
    return;
  }

  console.log("Forge AI Provider Router");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge ai status");
  console.log("  aift-forge ai models");
  console.log("  aift-forge ai chat --model llama3.2 --prompt Say hello");
  console.log("  aift-forge ai complete --model llama3.2 --prompt Once upon a time");
}
