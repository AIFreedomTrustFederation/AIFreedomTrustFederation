import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { getForgePaths } from "../lib/paths.mjs";
import { writeFileOnce } from "../lib/filesystem.mjs";
import { toCamelCase, toKebabCase } from "../lib/text.mjs";
import { ok, fail, section } from "../lib/logger.mjs";

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

  if (type !== "command") {
    fail(`Unknown generator type: ${type}`);
    console.log("Available generator types:");
    console.log("  command");
    process.exit(1);
  }

  const paths = getForgePaths(import.meta.url);
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
}
