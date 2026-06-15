# AIFT Forge Sovereign Policy

AIFT Forge exists so repositories, packages, releases, builds, and node mirrors can be governed by transparent operator-owned rules instead of hidden platform rules.

## No arbitrary rules

AIFT Forge should not enforce hidden, unexplained, or platform-owner-only rules.

Any rule that blocks a repo, build, package, release, mirror, account, or node should be:

- visible
- documented
- versioned
- appealable or reviewable
- locally inspectable
- exportable
- overridable by the authorized owner where lawful and safe

## Rule categories

AIFT Forge rules should be limited to transparent categories:

- safety rules
- security rules
- legal compliance rules
- resource rules
- trust and signing rules
- human approval rules
- federation compatibility rules
- local operator policy rules

## Local operator control

Each AIFT node owner should be able to inspect and configure local policy for:

- repo visibility
- mirror permissions
- package publishing
- build runner eligibility
- release channel promotion
- node federation
- AI provider usage
- human approval gates
- retention and logs

## Public mirror independence

GitHub or any other hosted forge may be used as a public mirror, but public mirror rules must not become the source of truth for AIFT runtime identity.

The AIFT runtime source of truth should remain:

- local repo registry
- AIFT relay registry
- signed release manifests
- node-owned mirror records
- operator-approved policies

## Human approval

Human approval is required for high-risk changes:

- changing repo visibility
- changing access control
- publishing stable releases
- signing artifacts
- deleting repos
- deleting packages
- pushing to public mirrors
- changing node routing
- promoting builds to release channels
- AI-generated code merges

## Rule transparency record

Every blocked action should eventually produce a rule event:

```json
{
  "rule_event_id": "rule-event-1",
  "scope": "release",
  "scope_id": "release-0.1.0",
  "rule_id": "unsigned-artifact-block",
  "decision": "blocked",
  "reason": "Stable releases require signed artifacts.",
  "appeal_or_override": "owner-review-required",
  "created_at": "ISO_DATE"
}
```

## Goal

AIFT Forge must be powerful enough to protect users without becoming an opaque gatekeeper. The owner should know what happened, why it happened, what rule was applied, and how to review or change the rule.
