export function registryTemplate({ exportName, typeName, records }) {
  const serialized = JSON.stringify(records, null, 2)
    .replace(/"([^"]+)":/g, "$1:");

  return `export type ${typeName} = {
  id: string;
  label: string;
  value?: string;
  description?: string;
};

export const ${exportName}: ${typeName}[] = ${serialized};
`;
}
