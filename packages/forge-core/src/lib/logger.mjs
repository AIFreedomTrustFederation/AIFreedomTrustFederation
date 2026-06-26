export function section(label) {
  console.log("");
  console.log(`━━ ${label}`);
}

export function ok(message) {
  console.log(`✅ ${message}`);
}

export function warn(message) {
  console.log(`⚠️ ${message}`);
}

export function fail(message) {
  console.log(`❌ ${message}`);
}
