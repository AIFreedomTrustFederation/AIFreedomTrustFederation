import { assign } from "./assign.mjs";

export async function engineer(args = []) {
  const action = args[0] ?? "help";

  if (action === "assign") {
    await assign(args.slice(1));
    return;
  }

  console.log("Forge Engineer Command");
  console.log("");
  console.log("Usage:");
  console.log("  aift-forge engineer assign");
}

export default engineer;
