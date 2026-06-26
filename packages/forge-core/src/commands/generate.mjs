import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { getForgePaths } from "../lib/paths.mjs";
import { writeFileOnce } from "../lib/filesystem.mjs";
import { toCamelCase, toKebabCase, toPascalCase } from "../lib/text.mjs";
import { ok, fail, section } from "../lib/logger.mjs";
import { modelTemplate } from "../templates/model.template.mjs";
import { packageJsonTemplate, packageReadmeTemplate, packageIndexTemplate, packageTestTemplate } from "../templates/package-template.mjs";
import { repositoryReadmeTemplate, repositoryAgentsTemplate, repositoryManifestTemplate, repositoryPackageJsonTemplate, repositoryGitignoreTemplate, repositoryLicenseTemplate } from "../templates/repository-template.mjs";


function serviceTemplate(serviceName, functionName) {
  return `import { section, ok } from "../lib/logger.mjs";

export class ${serviceName} {
  constructor(context = {}) {
    this.context = context;
  }

  describe() {
    return {
      name: "${serviceName}",
      phase: "generated",
      contextKeys: Object.keys(this.context)
    };
  }
}

export function create${serviceName}(context = {}) {
  return new ${serviceName}(context);
}

export function ${functionName}(context = {}) {
  section("${serviceName}");
  const service = create${serviceName}(context);
  ok("${serviceName} scaffold created.");
  return service.describe();
}
`;
}


function toExportName(name) {
  const camel = toCamelCase(name);
  return camel.charAt(0).toLowerCase() + camel.slice(1);
}

function commandTemplate(commandName, functionName) {
  return `import { section, ok } from "../lib/logger.mjs";

export function ${functionName}() {
  section("${commandName}");
  ok("${commandName} command scaffold created.");
}
`;
}

function wireCliCommand(cliPath, commandName, functionName) {
  let text = readFileSync(cliPath, "utf8");

  const importLine = `import { ${functionName} } from "../commands/${commandName}.mjs";`;

  if (!text.includes(importLine)) {
    const lastImport = text.match(/import .+;\n/g)?.at(-1);

    if (lastImport) {
      text = text.replace(lastImport, `${lastImport}${importLine}\n`);
    } else {
      text = `${importLine}\n${text}`;
    }
  }

  const helpLine = `  console.log("  ${commandName.padEnd(10)} Scaffolded command");`;

  if (!text.includes(helpLine)) {
    text = text.replace(
      '  console.log("  help       Show this help");',
      `${helpLine}\n  console.log("  help       Show this help");`
    );
  }

  const caseBlock = `  case "${commandName}":
    ${functionName}();
    break;`;

  if (!text.includes(`case "${commandName}":`)) {
    text = text.replace(
      '  case "help":',
      `${caseBlock}
  case "help":`
    );
  }

  writeFileSync(cliPath, text);
}

export function generate(args = []) {
  const type = args[0];
  const name = args[1];

  if (!type || !name) {
    fail("Usage: aift-forge generate command <name>");
    process.exit(1);
  }

  const paths = getForgePaths(import.meta.url);

  if (type === "command") {
    const commandName = toKebabCase(name);
    const functionName = toCamelCase(commandName);
    const commandPath = join(paths.repoRoot, "packages/forge-core/src/commands", `${commandName}.mjs`);
    const cliPath = join(paths.repoRoot, "packages/forge-core/src/cli/index.mjs");

    section("Generate Command");
    console.log(`Command: ${commandName}`);
    console.log(`Function: ${functionName}`);
    console.log(`File: ${commandPath}`);

    writeFileOnce(commandPath, commandTemplate(commandName, functionName));
    wireCliCommand(cliPath, commandName, functionName);

    ok(`Generated command: ${commandName}`);
    console.log("");
    console.log("Test with:");
    console.log(`  aift-forge ${commandName}`);
    return;
  }

  if (type === "repository" || type === "repo") {
    const repoName = toKebabCase(name);
    const displayName = toPascalCase(name);
    const repoRoot = join(paths.aiftRoot, repoName);

    section("Generate Repository");
    console.log(`Repository: ${repoName}`);
    console.log(`Path: ${repoRoot}`);

    writeFileOnce(join(repoRoot, "README.md"), repositoryReadmeTemplate({ displayName, repoName }));
    writeFileOnce(join(repoRoot, "AGENTS.md"), repositoryAgentsTemplate({ displayName }));
    writeFileOnce(join(repoRoot, "LICENSE"), repositoryLicenseTemplate());
    writeFileOnce(join(repoRoot, "package.json"), repositoryPackageJsonTemplate({ repoName }));
    writeFileOnce(join(repoRoot, "aift-manifest.json"), repositoryManifestTemplate({ repoName, displayName }));
    writeFileOnce(join(repoRoot, ".gitignore"), repositoryGitignoreTemplate());
    writeFileOnce(join(repoRoot, "docs/.gitkeep"), "");
    writeFileOnce(join(repoRoot, "apps/.gitkeep"), "");
    writeFileOnce(join(repoRoot, "packages/.gitkeep"), "");
    writeFileOnce(join(repoRoot, "scripts/.gitkeep"), "");

    ok(`Generated repository scaffold: ${repoName}`);
    console.log("");
    console.log("Next:");
    console.log(`  cd ${repoRoot}`);
    console.log("  git init");
    console.log("  git add .");
    console.log(`  git commit -m "Initialize ${displayName}"`);
    return;
  }

  if (type === "package") {
    const packageName = toKebabCase(name);
    const displayName = toPascalCase(name);
    const exportName = toExportName(name);
    const packageRoot = join(paths.repoRoot, "packages", packageName);

    section("Generate Package");
    console.log(`Package: ${packageName}`);
    console.log(`Path: ${packageRoot}`);

    writeFileOnce(join(packageRoot, "package.json"), packageJsonTemplate({ packageName }));
    writeFileOnce(join(packageRoot, "README.md"), packageReadmeTemplate({ displayName }));
    writeFileOnce(join(packageRoot, "src/index.mjs"), packageIndexTemplate({ exportName }));
    writeFileOnce(join(packageRoot, "tests/index.test.mjs"), packageTestTemplate({ exportName, packageName }));

    ok(`Generated package: ${packageName}`);
    console.log("");
    console.log("Test with:");
    console.log(`  cd packages/${packageName}`);
    console.log("  npm test");
    return;
  }

  if (type === "model") {
    const modelName = toPascalCase(name);
    const fileName = toKebabCase(modelName);
    const modelPath = join(paths.repoRoot, "packages/forge-core/src/models", `${fileName}.mjs`);

    section("Generate Model");
    console.log(`Model: ${modelName}`);
    console.log(`File: ${modelPath}`);

    writeFileOnce(modelPath, modelTemplate({ modelName }));

    ok(`Generated model: ${modelName}`);
    console.log("");
    console.log("Import with:");
    console.log(`  import { ${modelName} } from "./models/${fileName}.mjs";`);
    return;
  }

  if (type === "service") {
    const serviceName = toPascalCase(name.endsWith("Service") ? name : `${name}Service`);
    const fileName = toKebabCase(serviceName);
    const functionName = `run${serviceName}`;
    const servicePath = join(paths.repoRoot, "packages/forge-core/src/services", `${fileName}.mjs`);

    section("Generate Service");
    console.log(`Service: ${serviceName}`);
    console.log(`Function: ${functionName}`);
    console.log(`File: ${servicePath}`);

    writeFileOnce(servicePath, serviceTemplate(serviceName, functionName));

    ok(`Generated service: ${serviceName}`);
    console.log("");
    console.log("Import with:");
    console.log(`  import { ${serviceName} } from "./services/${fileName}.mjs";`);
    return;
  }

  fail(`Unknown generator type: ${type}`);
  console.log("Available generator types:");
  console.log("  command");
  console.log("  service");
  console.log("  model");
  console.log("  package");
  console.log("  repository");
  process.exit(1);
}
