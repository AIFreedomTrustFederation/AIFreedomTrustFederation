# AIFT-Forge AI Runtime Phase 2

Phase 2 adds a usable local AI runtime on top of the provider registry.

## New Commands

Discover models:

    aift-forge models

Ask local AI:

    aift-forge ask "Explain AIFT-Forge"

Use a specific model:

    aift-forge ask --model llama3.2 "Write a sovereign AI mission statement"

Use completion mode:

    aift-forge ask --mode completion --model llama3.2 "Once upon a time"

## Architecture

    user command
        ↓
    AI runtime
        ↓
    provider router
        ↓
    capability negotiation
        ↓
    provider adapter
        ↓
    local HTTP model runtime

## Policy

- No cloud fallback
- No API keys
- Localhost/private LAN only
- User-owned provider registry
- Android/Termux-compatible
