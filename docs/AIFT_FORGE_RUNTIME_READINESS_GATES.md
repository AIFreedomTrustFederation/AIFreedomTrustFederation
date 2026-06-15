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

Still required:

- Repo transport requests must use the local session identity.
- Anonymous sessions must be limited by repo visibility.
- Failed checks must produce local audit records.

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

Still required:

- Local session check must run inside the transport bridge.
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
