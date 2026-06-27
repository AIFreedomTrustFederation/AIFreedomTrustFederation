import { join } from "node:path";
import { writeGeneratedFile } from "./writer.mjs";
import { reactComponentTemplate } from "./templates/react-component.mjs";
import { registryTemplate } from "./templates/registry.mjs";

function pascalCase(input) {
  return input
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function camelCase(input) {
  const pascal = pascalCase(input);
  return pascal[0].toLowerCase() + pascal.slice(1);
}

export class ForgeCodegenEngine {
  constructor(context = {}) {
    this.webRoot = context.webRoot;
  }

  generatePanel({ id, title, description }) {
    const name = pascalCase(id);
    const path = join(this.webRoot, "components", `${name}.tsx`);

    return writeGeneratedFile(
      path,
      reactComponentTemplate({
        name,
        title,
        description
      })
    );
  }

  generateRegistry({ id, records }) {
    const exportName = `${camelCase(id)}Registry`;
    const typeName = `${pascalCase(id)}Record`;
    const path = join(this.webRoot, "lib", `${id}-registry.ts`);

    return writeGeneratedFile(
      path,
      registryTemplate({
        exportName,
        typeName,
        records
      })
    );
  }

  generateFeature({ id, title, description, records = [] }) {
    const outputs = [];

    outputs.push(this.generatePanel({ id, title, description }));

    if (records.length) {
      outputs.push(this.generateRegistry({ id, records }));
    }

    return outputs;
  }
}
