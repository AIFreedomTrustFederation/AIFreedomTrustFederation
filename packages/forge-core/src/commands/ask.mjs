import { askLocalAI, extractText } from "../ai/runtime.mjs";

function readFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

export default async function ask(args = []) {
  const model = readFlag(args, "--model", process.env.FORGE_MODEL ?? "llama3.2");
  const system = readFlag(args, "--system", undefined);
  const mode = readFlag(args, "--mode", "chat");

  const prompt = args
    .filter((arg, index) => {
      const previous = args[index - 1];
      return !["--model", "--system", "--mode"].includes(arg) &&
        !["--model", "--system", "--mode"].includes(previous);
    })
    .join(" ")
    .trim();

  if (!prompt) {
    console.log("Usage:");
    console.log("  aift-forge ask \"Explain AIFT-Forge\"");
    console.log("  aift-forge ask --model llama3.2 \"Write a README intro\"");
    return;
  }

  const result = await askLocalAI({
    model,
    system,
    prompt,
    mode
  });

  if (!result.ok) {
    console.log(`❌ ${result.error ?? "Local AI request failed."}`);
    return;
  }

  console.log(extractText(result));
}
