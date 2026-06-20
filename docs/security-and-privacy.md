# AIFT Forge Security And Privacy

This document records AIFT Forge security and privacy boundaries. It is an engineering status document, not an audit report.

## Security status

| Area                     | Status                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Formal third-party audit | Not audited                                                    |
| Dependency audit gate    | `npm audit --audit-level=high` passes locally                  |
| Token storage            | Local tokens are stored as SHA-256 hashes                      |
| Public mirror dependency | Optional mirror only, not runtime source of truth              |
| Stable release signing   | Not implemented                                                |
| Protected Git writes     | Not trusted until protected gates and live push evidence exist |

## No secrets in public source

Do not commit:

- API keys;
- local tokens;
- wallet keys;
- registry signing keys;
- private relay credentials;
- mailbox credentials;
- private model credentials;
- customer or operator private data.

Use `.env.example` only for names and safe placeholders. Real credentials belong in operator-controlled local configuration outside public source.

## Human approval boundaries

Human approval is required before:

- publishing stable releases;
- signing artifacts;
- pushing private code to a public mirror;
- changing repo visibility or access control;
- trusting Smart HTTP receive-pack writes as production behavior;
- changing registry, name, wallet, financial, legal, safety, or custody logic;
- making audited, production-ready, live, secure, or deployed claims.

## Local identity and transport

AIFT Forge is local-first. Current transport rules:

- anonymous Smart HTTP sessions may read public repositories only;
- private repository reads require local token identity and repo permission;
- receive-pack writes require a valid local token with `repo:write` or `admin:local` scope;
- denied transport attempts must produce local blocked-action records.

Remaining transport work:

- protected ref and review gates;
- actor metadata on blocked-action records;
- live Git client clone/fetch/push evidence;
- request size limits and streaming for Git RPC.

## AI privacy

AI integrations must be provider-neutral and disabled unless configured. Prompts must not include secrets or private user data unless the operator explicitly authorizes a scoped private action and the action records that approval.

AI may draft, classify, summarize, and recommend. It must not silently merge, release, sign, publish, route, delete, transfer custody, or expose private data.

## Dependency risk

Dependencies are candidates until they pass:

- install verification;
- high-severity audit gate;
- license review;
- integration smoke test;
- fallback review;
- human release approval.

Optional native integrations must not block local baseline verification when a documented fallback exists.

## Incident response

If a secret is committed, a dependency is compromised, or a public claim is found to be false:

1. Stop release promotion.
2. Record the affected file, dependency, route, or claim.
3. Rotate any exposed credential outside the repository.
4. Remove or correct the public claim.
5. Add or update a regression check where practical.
6. Report what was verified and what remains unknown.
