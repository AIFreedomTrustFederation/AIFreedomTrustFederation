#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "🧬 Adding Forge model generator with template support"

mkdir -p packages/forge-core/src/templates
mkdir -p packages/forge-core/src/models

cat > packages/forge-core/src/templates/model.template.mjs <<'JS'
export function modelTemplate({ modelName }) {
  return `export class ${modelName} {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  static from(data = {}) {
    return new ${modelName}(data);
  }

  toJSON() {
    return { ...this };
  }
}
`;
}
JS

python - <<'PY'
from pathlib import Path

p = Path("packages/forge-core/src/commands/generate.mjs")
text = p.read_text()

if 'import { modelTemplate } from "../templates/model.template.mjs";' not in text:
    last_imports = [line for line in text.splitlines() if line.startswith("import ")]
    last = last_imports[-1]
    text = text.replace(last, last + '\nimport { modelTemplate } from "../templates/model.template.mjs";')

if 'if (type === "model")' not in text:
    marker = '  if (type === "service") {'
    insert = r'''  if (type === "model") {
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

'''
    text = text.replace(marker, insert + marker)

if 'console.log("  model");' not in text:
    text = text.replace(
        'console.log("  service");',
        'console.log("  service");\n  console.log("  model");'
    )

p.write_text(text)
PY

echo "✅ Model generator added."
echo ""
echo "Test:"
echo "  aift-forge generate model Repository"
