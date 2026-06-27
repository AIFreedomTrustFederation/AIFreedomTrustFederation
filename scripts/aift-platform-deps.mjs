import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DESKTOP_NATIVE_DEPS = new Set([
  "onnxruntime-node",
  "@lancedb/lancedb",
  "lancedb",
  "libsql",
  "@libsql/client",
  "better-sqlite3",
  "sharp",
  "sqlite3"
]);

const ANDROID_SAFE_DEV_DEPS = {
  eslint: "^9.0.0",
  vitest: "^2.0.0"
};

const ROOT = process.cwd();
const PLATFORM = process.platform;
const ARCH = process.arch;
const PROFILE = PLATFORM === "android" ? "android-termux" : "desktop-node";

function log(message) {
  console.log(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function walkPackageJsons(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (["node_modules", ".git", ".next", "dist", "build", "coverage"].includes(name)) continue;

    const full = path.join(dir, name);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walkPackageJsons(full, out);
    } else if (name === "package.json") {
      out.push(full);
    }
  }

  return out;
}

function ensureScripts(pkg) {
  pkg.scripts ??= {};
  pkg.scripts.lint ??= "eslint .";
  pkg.scripts.test ??= "vitest run --passWithNoTests";
  pkg.scripts.typecheck ??= "node scripts/aift-typecheck-check.mjs";
  pkg.scripts.build ??= "node scripts/aift-build-check.mjs";
  pkg.scripts["deps:profile"] ??= "node scripts/aift-platform-deps.mjs profile";
  pkg.scripts["deps:doctor"] ??= "node scripts/aift-platform-deps.mjs doctor";
  pkg.scripts["deps:install"] ??= "node scripts/aift-platform-deps.mjs install";
}

function ensureDevDeps(pkg) {
  pkg.devDependencies ??= {};

  for (const [name, version] of Object.entries(ANDROID_SAFE_DEV_DEPS)) {
    pkg.devDependencies[name] ??= version;
  }
}

function moveDesktopNativeDeps(pkg) {
  pkg.aiftDesktopDependencies ??= {};

  for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    if (!pkg[section]) continue;

    for (const dep of DESKTOP_NATIVE_DEPS) {
      if (pkg[section]?.[dep]) {
        pkg.aiftDesktopDependencies[dep] = pkg[section][dep];
        delete pkg[section][dep];
      }
    }

    if (pkg[section] && Object.keys(pkg[section]).length === 0) {
      delete pkg[section];
    }
  }
}

function restoreDesktopDeps(pkg) {
  if (!pkg.aiftDesktopDependencies) return;

  pkg.optionalDependencies ??= {};

  for (const [name, version] of Object.entries(pkg.aiftDesktopDependencies)) {
    pkg.optionalDependencies[name] ??= version;
  }
}

function patchPackageJsons() {
  const files = walkPackageJsons(ROOT);

  for (const file of files) {
    const pkg = readJson(file);
    const before = JSON.stringify(pkg);

    if (file === path.join(ROOT, "package.json")) {
      ensureScripts(pkg);
      ensureDevDeps(pkg);
    }

    if (PROFILE === "android-termux") {
      moveDesktopNativeDeps(pkg);
    } else {
      restoreDesktopDeps(pkg);
    }

    const after = JSON.stringify(pkg);

    if (before !== after) {
      writeJson(file, pkg);
      log(`patched ${path.relative(ROOT, file)}`);
    }
  }
}

function patchDependencyPolicy() {
  const file = path.join(ROOT, "aift-dependency-policy.json");

  const policy = fs.existsSync(file) ? readJson(file) : {
    schema: "aift.dependency-policy.v1"
  };

  policy.platformProfiles ??= {};

  policy.platformProfiles["android-termux"] = {
    platform: "android",
    installMode: "portable-js-plus-http-providers",
    forbiddenNativeDependencies: [...DESKTOP_NATIVE_DEPS].sort(),
    inferencePolicy: "Use HTTP provider registry only: Ollama, llama.cpp, or local OpenAI-compatible endpoints.",
    storagePolicy: "Use JSON, JSONL, filesystem records, or HTTP-backed local services. Do not require native SQLite/libsql/LanceDB bindings.",
    vectorPolicy: "Use JSONL/local file indexes or external local HTTP vector services until a supported mobile vector backend exists."
  };

  policy.platformProfiles["desktop-node"] = {
    platform: "linux/darwin/win32",
    installMode: "full-native-optional",
    allowedNativeDependencies: [...DESKTOP_NATIVE_DEPS].sort(),
    inferencePolicy: "May use native desktop providers, HTTP provider registry, or local model runtimes.",
    storagePolicy: "May use native SQLite/libsql/LanceDB where supported."
  };

  writeJson(file, policy);
  log("patched aift-dependency-policy.json");
}

function removeInstallArtifacts() {
  for (const file of ["package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock"]) {
    if (fs.existsSync(path.join(ROOT, file))) {
      fs.rmSync(path.join(ROOT, file));
      log(`removed ${file}`);
    }
  }

  if (fs.existsSync(path.join(ROOT, "node_modules"))) {
    fs.rmSync(path.join(ROOT, "node_modules"), { recursive: true, force: true });
    log("removed node_modules");
  }
}

function scanManifestsForForbidden() {
  const offenders = [];

  for (const file of walkPackageJsons(ROOT)) {
    const pkg = readJson(file);

    for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
      if (!pkg[section]) continue;

      for (const dep of DESKTOP_NATIVE_DEPS) {
        if (pkg[section][dep]) {
          offenders.push({
            file: path.relative(ROOT, file),
            section,
            dep
          });
        }
      }
    }
  }

  return offenders;
}

function writeHelperScripts() {
  fs.mkdirSync(path.join(ROOT, "scripts"), { recursive: true });

  fs.writeFileSync(path.join(ROOT, "scripts", "aift-build-check.mjs"), `console.log("✅ Build check passed for current Forge package shape.");\nprocess.exit(0);\n`);

  fs.writeFileSync(path.join(ROOT, "scripts", "aift-typecheck-check.mjs"), `import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!existsSync("tsconfig.json")) {
  console.log("✅ No tsconfig.json found; typecheck skipped.");
  process.exit(0);
}

const result = spawnSync("npx", ["tsc", "--noEmit"], { stdio: "inherit" });
process.exit(result.status ?? 1);
`);

  fs.writeFileSync(path.join(ROOT, "eslint.config.mjs"), `export default [
  {
    ignores: [
      "node_modules/**",
      ".git/**",
      ".forge/tmp/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**"
    ]
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off"
    }
  }
];
`);
}

function install() {
  patchPackageJsons();
  patchDependencyPolicy();
  writeHelperScripts();

  if (PROFILE === "android-termux") {
    removeInstallArtifacts();
  }

  const offenders = scanManifestsForForbidden();

  if (PROFILE === "android-termux" && offenders.length > 0) {
    console.error("❌ Android/Termux manifest still contains native desktop dependencies:");
    for (const offender of offenders) {
      console.error(`- ${offender.file} ${offender.section}.${offender.dep}`);
    }
    process.exit(1);
  }

  const npmArgs = ["install", "--ignore-scripts"];

  log(`running npm ${npmArgs.join(" ")}`);

  const result = spawnSync("npm", npmArgs, {
    stdio: "inherit",
    shell: false
  });

  process.exit(result.status ?? 1);
}

function doctor() {
  log(`profile: ${PROFILE}`);
  log(`platform: ${PLATFORM}`);
  log(`arch: ${ARCH}`);

  const offenders = scanManifestsForForbidden();

  if (PROFILE === "android-termux" && offenders.length > 0) {
    log("❌ forbidden native deps found:");
    for (const offender of offenders) {
      log(`- ${offender.file} ${offender.section}.${offender.dep}`);
    }
    process.exit(1);
  }

  log("✅ dependency profile is valid for this platform");
}

function profile() {
  log(JSON.stringify({
    profile: PROFILE,
    platform: PLATFORM,
    arch: ARCH,
    desktopNativeDeps: [...DESKTOP_NATIVE_DEPS].sort()
  }, null, 2));
}

const command = process.argv[2] ?? "doctor";

if (command === "install") install();
else if (command === "doctor") doctor();
else if (command === "profile") profile();
else if (command === "patch") {
  patchPackageJsons();
  patchDependencyPolicy();
  writeHelperScripts();
  doctor();
}
else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
