import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { grantRepoPermission } from "../packages/forge-core/src/identity.mjs";
import { resolveGitSmartHttpAccess } from "../packages/forge-core/src/git-rpc-http.mjs";
import { createLocalToken } from "../packages/forge-core/src/token-auth.mjs";
import {
  readState,
  resetState,
  writeState,
} from "../packages/forge-core/src/store.mjs";

let tempHome;

function request(token) {
  return token
    ? { headers: { authorization: `Bearer ${token}` } }
    : { headers: {} };
}

beforeEach(() => {
  tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "aift-forge-vitest-"));
  process.env.AIFT_FORGE_HOME = tempHome;
  resetState();
});

afterEach(() => {
  delete process.env.AIFT_FORGE_HOME;
  if (tempHome) fs.rmSync(tempHome, { recursive: true, force: true });
});

describe("Git smart HTTP token access", () => {
  it("allows anonymous public reads without upgrading the actor", () => {
    const access = resolveGitSmartHttpAccess(
      "aift-root",
      request(),
      "git-upload-pack",
    );

    expect(access.allowed).toBe(true);
    expect(access.authenticated).toBe(false);
  });

  it("requires local token identity for private reads and receive-pack writes", () => {
    const publicRepo = readState().repos[0];
    writeState({
      ...readState(),
      repos: [{ ...publicRepo, visibility: "local" }],
    });

    const privateRead = resolveGitSmartHttpAccess(
      "aift-root",
      request(),
      "git-upload-pack",
    );
    expect(privateRead.allowed).toBe(false);

    const readToken = createLocalToken({
      user_id: "reader",
      scopes: ["repo:read"],
    }).issued_token;
    grantRepoPermission({
      repo_id: "aift-root",
      user_id: "reader",
      role: "reader",
    });

    const authorizedRead = resolveGitSmartHttpAccess(
      "aift-root",
      request(readToken),
      "git-upload-pack",
    );
    expect(authorizedRead.allowed).toBe(true);

    const deniedWrite = resolveGitSmartHttpAccess(
      "aift-root",
      request(readToken),
      "git-receive-pack",
    );
    expect(deniedWrite.allowed).toBe(false);
    expect(deniedWrite.reason).toMatch(/repo:write/);

    const writeToken = createLocalToken({
      user_id: "writer",
      scopes: ["repo:write"],
    }).issued_token;
    grantRepoPermission({
      repo_id: "aift-root",
      user_id: "writer",
      role: "write",
    });

    const authorizedWrite = resolveGitSmartHttpAccess(
      "aift-root",
      request(writeToken),
      "git-receive-pack",
    );
    expect(authorizedWrite.allowed).toBe(true);
  });
});
