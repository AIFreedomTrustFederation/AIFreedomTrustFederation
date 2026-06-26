export function toKebabCase(input) {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function toCamelCase(input) {
  const kebab = toKebabCase(input);
  return kebab.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

export function toPascalCase(input) {
  const camel = toCamelCase(input);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
