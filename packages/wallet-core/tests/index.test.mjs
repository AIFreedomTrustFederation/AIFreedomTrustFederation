import test from "node:test";
import assert from "node:assert/strict";
import { walletCore } from "../src/index.mjs";

test("wallet-core exports foundation object", () => {
  assert.equal(walletCore.status, "foundation");
});
