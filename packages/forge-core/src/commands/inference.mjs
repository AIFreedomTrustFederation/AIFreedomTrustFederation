export default async function inference(args = []) {
  const action = args[0] ?? "status";

  console.log("🧠 Forge Local Inference");
  console.log("");

  if (action === "health") {
    console.log("Health:");
    console.log("⚠️ Local inference provider must be running separately.");
    console.log("Preferred: Ollama on localhost or private LAN.");
    console.log("");
  }

  console.log("Policy:");
  console.log("✅ Local-only inference required");
  console.log("✅ No API keys");
  console.log("✅ No cloud fallback");
  console.log("✅ Open-source runtimes preferred");
  console.log("");
  console.log("Supported:");
  console.log("- Ollama");
  console.log("- llama.cpp server");
  console.log("- LM Studio / vLLM local OpenAI-compatible server");
}
