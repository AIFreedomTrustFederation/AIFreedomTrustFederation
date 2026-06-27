export default async function lanOllama() {
  console.log("🌐 LAN scan disabled");
  console.log("");
  console.log("Android/Termux often blocks subnet discovery and netlink access.");
  console.log("Forge now uses a cross-platform JSON provider registry instead.");
  console.log("");
  console.log("Add a provider manually:");
  console.log("  aift-forge provider add my-ollama http://192.168.1.50:11434 ollama");
  console.log("");
  console.log("Then check:");
  console.log("  aift-forge provider health");
}
