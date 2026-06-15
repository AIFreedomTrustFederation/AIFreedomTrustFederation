# Installable App Architecture

This root repository is the installable product shell for AI Freedom Trust Federation.

The VPS repository remains the node engine. This repository packages the user-facing product for desktop, web, and Android.

## Repository roles

## Root repo

`AIFreedomTrustFederation/AIFreedomTrustFederation`

Purpose:

- public identity root
- doctrine root
- product web shell
- Windows desktop app shell
- Android app shell
- release manifest root
- future installer and package channel

## VPS repo

`AIFreedomTrustFederation/VPS`

Purpose:

- local AIFT node runtime
- dashboard engine
- router and gateway
- provider node logic
- federation registry
- sovereign repo registry
- build and deploy engine

## Desktop app

The desktop app should open the local node dashboard by default. If the node is not running, it should show an offline/fallback screen and explain that the node must be started.

Initial wrapper:

- Electron shell
- Windows NSIS installer target
- Windows portable target
- local-node-first loading behavior

Later versions should install, start, stop, and inspect the node engine directly.

## Android app

The Android app starts as a local-first app shell.

Initial responsibilities:

- show local node status
- open local dashboard
- show node identity
- show phone URL
- show relay status
- show repo status

Later responsibilities:

- manage the node service
- manage APK updates
- register with selected relay
- manage federation peers
- package static UI and node runtime assets

## Release manifest

Each installable release should eventually include:

- app id
- version
- platform
- source commit
- build time
- package hash
- signing status
- release channel
- compatible node engine version

## Core principle

The installable app should help users run their own node. It should not make GitHub, a hosted API, or a proprietary relay mandatory for local operation.
