# AIFT Forge Runtime Readiness Gates

This checklist protects runtime testing order.

## Gate A: Local session identity

The backend must resolve a caller from local state before any sensitive repo operation is accepted.

Ready:

- Local token records exist.
- Token creation route exists.
- Token check route exists.
- Token revocation route exists.
- Local setup route exists.
- Smart HTTP Git RPC resolves a local token identity before write-class transport is allowed.
- Anonymous Smart HTTP sessions are limited to public repository reads.

Still required:

- JSON transport request routes must use the same token actor path as Smart HTTP.
- Failed checks must produce richer local audit records with actor and request metadata.
- Runtime clone/fetch/push smoke evidence must be recorded after protected write gates are complete.

## Gate B: Local approval policy

Mainline and release operations must have local review/status approval policy before they are trusted.

Ready:

- Approval records exist.
- Build flow records exist.
- Package and release manifest records exist.
- Local audit records exist.

Still required:

- Default local policy record.
- Policy status readout.
- Policy check before sensitive repo operations.

## Gate C: Trusted transport state

Transport behavior is only trusted after Gate A and Gate B pass.

Ready:

- Local repo storage exists.
- Local repo inspection exists.
- Read utilities exist.
- Smart transport bridge exists.
- Smart HTTP write requests require a valid local token with `repo:write` scope.

Still required:

- Local approval policy must run before sensitive transport behavior.
- Runtime evidence must be recorded after local smoke testing.

## Allowed tests before all gates pass

- Health route.
- State route.
- Local setup route.
- Token route family.
- Repo init and inspect.
- Branch, tag, commit, tree, blob, and diff reads.
- Read-path transport experiments.

## Deferred until all gates pass

- Trusting sensitive repo updates.
- Treating remote-style repo writes as production-ready.
- Public exposure of transport endpoints.
