# AIFT Forge Verification

AIFT Forge must be verified before packaging desktop or Android releases.

## Current verification script

The root repo includes:

`scripts/verify-forge-structure.mjs`

This script checks:

- required root manifests
- required docs
- required workspace package files
- product web files
- desktop wrapper files
- Android shell files
- JSON validity
- workspace registration
- required Forge UI labels

## Required local checks

Before a release, run these checks from the repository root:

1. structure verification
2. dependency installation
3. product web build
4. desktop package metadata check
5. Android shell check
6. release manifest check

## Build levels

### Level 1: structure verified

All required files exist and parse correctly.

### Level 2: web build verified

The product web app compiles into a static bundle.

### Level 3: desktop wrapper verified

The desktop shell opens the configured local node URL or fallback page.

### Level 4: Windows package verified

The Windows installer and portable build are generated and inspected.

### Level 5: Android project generated

The Android shell is generated into a native Android project.

### Level 6: APK verified

The APK installs, opens, and displays the AIFT Cloud shell.

## Long term

AIFT Forge should run verification on AIFT-operated builder nodes instead of depending on hosted CI as the source of truth.

Hosted CI may be used as a public mirror check, but AIFT-operated verification should remain canonical.
