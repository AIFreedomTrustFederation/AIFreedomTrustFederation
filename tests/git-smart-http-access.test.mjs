import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { grantRepoPermission } from "../packages/forge-core/src/identity.mjs";
import { resolveGitSmartHttpAccess } from "../packages/forge-core/src/git-rpc-http.mjs";
import {
  checkProtectedWritePolicy,
  enforceProtectedWritePolicy,
  parseReceivePackUpdates,
} from "../packages/forge-core/src/protected-write-policy.mjs";
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

function receivePackLine(ref) {
  const oldOid = "0".repeat(40);
  const newOid = "1".repeat(40);
  const line = `${oldOid} ${newOid} ${ref}\0 report-status\n`;
  const size = (Buffer.byteLength(line) + 4).toString(16).padStart(4, "0");
  return Buffer.concat([Buffer.from(size + line, "utf8"), Buffer.from("0000")]);
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

  it("parses receive-pack ref updates for policy checks", () => {
    const updates = parseReceivePackUpdates(receivePackLine("refs/heads/main"));

    expect(updates).toHaveLength(1);
    expect(updates[0].ref).toBe("refs/heads/main");
  });

  it("blocks protected writes until an approved local approval exists", () => {
    const denied = enforceProtectedWritePolicy({
      repo_id: "aift-root",
      action: "git-receive-pack",
      ref_updates: [{ ref: "refs/heads/main", old_oid: "0".repeat(40), new_oid: "1".repeat(40) }],
    });

    expect(denied.allowed).toBe(false);
    expect(denied.reason).toMatch(/protected ref refs\/heads\/main/);
    expect(readState().blocked_actions[0].policy).toBe("protected-write");

    const feature = checkProtectedWritePolicy({
      repo_id: "aift-root",
      ref_updates: [{ ref: "refs/heads/feature/demo", old_oid: "0".repeat(40), new_oid: "1".repeat(40) }],
    });
    expect(feature.allowed).toBe(true);

    writeState({
      ...readState(),
      approvals: [
        {
          approval_id: "approval-main",
          scope: "git-protected-write",
          scope_id: "aift-root:refs/heads/main",
          decision: "approved",
          reason: "Approve main branch smoke write.",
          created_at: new Date().toISOString(),
        },
      ],
    });

    const approved = checkProtectedWritePolicy({
      repo_id: "aift-root",
      ref_updates: [{ ref: "refs/heads/main", old_oid: "0".repeat(40), new_oid: "1".repeat(40) }],
    });
    expect(approved.allowed).toBe(true);
  });
});
