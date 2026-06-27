# AIFT-Forge Phase 12C: Improve Command Integration

Phase 12C unifies Phase 12A and Phase 12B behind one `improve` command surface.

## Unified Command

Analysis:

    aift-forge improve status
    aift-forge improve scan
    aift-forge improve analyze
    aift-forge improve scans
    aift-forge improve reports
    aift-forge improve proposals
    aift-forge improve proposal-show proposal-id

Patches:

    aift-forge improve patch-generate proposal-id
    aift-forge improve patches
    aift-forge improve patch-show patch-id
    aift-forge improve patch-validate patch-id
    aift-forge improve patch-apply patch-id --approval approval-id
    aift-forge improve approvals
    aift-forge improve approve approval-id
    aift-forge improve reject approval-id

Doctor:

    aift-forge improve doctor

## Compatibility

The separate `improve-patch` command may remain available, but `improve` is now the preferred command surface.
