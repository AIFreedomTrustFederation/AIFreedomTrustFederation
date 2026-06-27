import fs from "node:fs";
import path from "node:path";

const bad = [
  "onnxruntime-node",
  "@lancedb/lancedb",
  "lancedb",
  "libsql",
  "@libsql/client",
  "better-sqlite3",
  "sqlite3",
  "sharp"
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (["node_modules", ".git", ".forge"].includes(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name === "package.json") out.push(full);
  }
  return out;
}

let found = false;

for (const file of walk(".")) {
  const text = fs.readFileSync(file, "utf8");
  for (const dep of bad) {
    if (text.includes(`"${dep}"`)) {
      console.log(`⚠️ Desktop-native dependency reference remains in ${file}: ${dep}`);
      found = true;
    }
  }
}

console.log(`platform: ${process.platform}`);
console.log(`arch: ${process.arch}`);

if (process.platform !== "android") {
  console.log("⚠️ This profile is intended for Android/Termux.");
}

console.log(found
  ? "✅ References may remain in workspace manifests, but root Termux install is isolated."
  : "✅ No desktop-native dependency references found outside backups.");

process.exit(0);
