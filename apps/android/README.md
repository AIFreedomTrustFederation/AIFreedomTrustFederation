# AIFT Cloud Android App

This directory is reserved for the installable Android application.

The Android app should be a local-first shell around the AIFT node system. Its first job is to help a user start, inspect, and open their local AIFT node. The VPS relay remains optional for local use and useful for federation.

## App responsibilities

- Show node identity.
- Show local dashboard status.
- Show phone LAN URL when available.
- Open the local AIFT dashboard.
- Register with an AFTP VPS relay when the operator chooses a relay.
- Display repo registry status.
- Display federation status.
- Keep GitHub as an optional mirror, not a required runtime dependency.

## Planned implementation path

The Android app can be implemented with Capacitor or a native Android WebView shell.

The first version should load bundled static UI and link to the local node dashboard. Later versions can manage the node service directly.

## Package identity

Recommended package id:

`org.aifreedomtrust.aiftcloud`

Recommended app name:

`AIFT Cloud`

## Build principle

Builds should be reproducible and should publish a manifest containing version, commit, build time, source hash, and release channel.
