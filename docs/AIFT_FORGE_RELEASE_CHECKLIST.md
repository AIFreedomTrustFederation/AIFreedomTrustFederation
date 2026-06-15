# AIFT Forge Release Checklist

Use this checklist before publishing any AIFT Forge release.

## Structure

- Root manifest exists.
- Forge manifest exists.
- AI manifest exists.
- Sovereign policy exists.
- Packaging requirements exist.
- Build readiness guide exists.
- Verification script exists.
- Readiness report script exists.

## Build verification

- Structure verification passed.
- Readiness report generated.
- Web app build passed.
- Desktop wrapper opened successfully.
- Android shell opened successfully.
- Platform package tools were available on the builder node.

## Package verification

- Web bundle produced.
- Windows installer target produced.
- Windows portable target produced.
- Android installable target produced.
- Node engine bundle target produced if included in the release.

## Artifact records

Each artifact record must include:

- product
- version
- release channel
- source commit
- builder node id
- artifact type
- artifact path
- hash
- signing status
- created time

## Human approval

Required approval before release promotion:

- package owner approval
- signing approval
- release channel approval
- public mirror approval if mirrored publicly

## AI usage

If AI assisted the release, record:

- agent used
- provider type
- output summary
- human review status
- approval decision

## Final release status

Allowed statuses:

- draft
- alpha
- beta
- release-candidate
- stable
- deprecated
- revoked
