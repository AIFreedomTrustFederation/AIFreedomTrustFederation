import http from "node:http";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function privateSubnetPrefix() {
  try {
    const route = execSync("ip route | grep wlan0 | head -n 1", { encoding: "utf8" });
    const match = route.match(/src\s+(\d+\.\d+\.\d+)\.\d+/);
    if (match) return match[1];
  } catch {}

  try {
    const ip = execSync("ip addr show wlan0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1", { encoding: "utf8" }).trim();
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  } catch {}

  return null;
}

function checkOllama(host) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host,
        port: 11434,
        path: "/api/tags",
        method: "GET",
        timeout: 800
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            host,
            endpoint: `http://${host}:11434`,
            body
          });
        });
      }
    );

    req.on("error", () => resolve({ ok: false, host }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, host });
    });

    req.end();
  });
}

export async function discoverLanOllama(paths) {
  const prefix = privateSubnetPrefix();

  if (!prefix) {
    return {
      ok: false,
      reason: "Could not determine local Wi-Fi subnet."
    };
  }

  console.log(`Scanning ${prefix}.1-254 for Ollama...`);

  const found = [];

  for (let i = 1; i <= 254; i += 16) {
    const batch = [];

    for (let j = i; j < i + 16 && j <= 254; j += 1) {
      batch.push(checkOllama(`${prefix}.${j}`));
    }

    const results = await Promise.all(batch);
    found.push(...results.filter((item) => item.ok));
  }

  if (!found.length) {
    return {
      ok: false,
      prefix,
      reason: "No Ollama server found on this LAN."
    };
  }

  const best = found[0];

  const envDir = join(paths.repoRoot, ".forge");
  mkdirSync(envDir, { recursive: true });

  const envFile = join(envDir, "local-inference.env");
  writeFileSync(envFile, `export OLLAMA_HOST="${best.endpoint}"\nexport FORGE_LOCAL_PROVIDER="ollama"\n`);

  return {
    ok: true,
    prefix,
    endpoint: best.endpoint,
    envFile,
    found
  };
}
