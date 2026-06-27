# AIFT-Forge Phase 12B: Safe Self-Improvement Workflow

Phase 12B adds approved patch generation and safe application.

## Commands

Generate patch from proposal:

    aift-forge improve-patch generate proposal-id

List patches:

    aift-forge improve-patch patches

Show patch:

    aift-forge improve-patch show patch-id

Validate patch:

    aift-forge improve-patch validate patch-id

Apply patch:

    aift-forge improve-patch apply patch-id

Approve pending patch:

    aift-forge improve-patch approve approval-id

Apply approved patch:

    aift-forge improve-patch apply patch-id --approval approval-id

## Governance

Phase 12B does not silently modify code.

Every patch requires:

- patch record
- explicit approval
- snapshot
- validation support
- auditable JSON records
