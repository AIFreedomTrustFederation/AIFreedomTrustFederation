# Forge Local Provider Registry

Forge does not scan the LAN directly.

Android and Termux often block low-level network discovery, subnet probing, and netlink access. Forge therefore uses an explicit local JSON provider registry instead of trying to discover inference servers automatically.

Registry path:

    .forge/providers/

## Commands

Initialize or repair the default registry:

    aift-forge provider init

List configured providers:

    aift-forge provider status

Check provider health:

    aift-forge provider health

Add a provider manually:

    aift-forge provider add my-ollama http://192.168.1.50:11434 ollama

Check inference availability:

    aift-forge inference health

## Governance Policy

Forge local inference follows these rules:

- Localhost or private LAN endpoints only
- No required API keys
- No cloud fallback
- No silent provider discovery
- User-owned registry files
- Disabled providers remain visible but inactive

## Default Providers

- Ollama Localhost: http://127.0.0.1:11434
- llama.cpp Localhost: http://127.0.0.1:8080
- Local OpenAI-compatible server: http://127.0.0.1:1234/v1

## Why LAN Scan Was Replaced

LAN scanning is fragile on Android and Termux. It can fail because of sandboxed networking, missing commands, unavailable netlink interfaces, or restricted subnet discovery.

The registry model is more sovereign and inspectable:

- The user chooses endpoints explicitly.
- Providers are plain JSON files.
- Cloud fallback is impossible by policy.
- Disabled providers remain visible for auditability.
- Local-first inference works consistently across desktop, Linux, Android, and Termux.
