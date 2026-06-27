import { strict as assert } from "node:assert";
import { extractText } from "../packages/forge-core/src/ai/runtime.mjs";

assert.equal(
  extractText({ body: { message: { content: "hello" } } }),
  "hello"
);

assert.equal(
  extractText({ body: { response: "completion" } }),
  "completion"
);

assert.equal(
  extractText({ body: { choices: [{ message: { content: "openai" } }] } }),
  "openai"
);

console.log("✅ AI runtime smoke test passed.");
