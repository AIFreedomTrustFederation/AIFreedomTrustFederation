import { dirname, normalize, join } from "node:path";

const importPatterns = [
  /import\s+[^'"]*from\s+["']([^"']+)["']/g,
  /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  /export\s+[^'"]*from\s+["']([^"']+)["']/g
];

function isRelative(specifier) {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function possibleTargets(sourcePath, specifier) {
  if (!isRelative(specifier)) return [];

  const base = normalize(join(dirname(sourcePath), specifier));
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.mjs`
  ];
}

export function parseImports(sourcePath, text) {
  const imports = [];

  for (const pattern of importPatterns) {
    for (const match of text.matchAll(pattern)) {
      const specifier = match[1];

      imports.push({
        source: sourcePath,
        specifier,
        relative: isRelative(specifier),
        possibleTargets: possibleTargets(sourcePath, specifier)
      });
    }
  }

  return imports;
}
