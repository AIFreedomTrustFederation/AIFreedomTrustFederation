export function interpolate(value, context = {}) {
  if (typeof value !== "string") return value;

  return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const parts = key.split(".");
    let current = context;

    for (const part of parts) {
      current = current?.[part];
    }

    if (current === undefined || current === null) return "";
    if (typeof current === "object") return JSON.stringify(current);

    return String(current);
  });
}

export function interpolateObject(value, context = {}) {
  if (typeof value === "string") return interpolate(value, context);

  if (Array.isArray(value)) {
    return value.map((item) => interpolateObject(item, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateObject(item, context)])
    );
  }

  return value;
}
