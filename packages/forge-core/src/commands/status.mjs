import { section, ok } from "../lib/logger.mjs";

export function status() {
  section("status");
  ok("status command scaffold created.");
}
