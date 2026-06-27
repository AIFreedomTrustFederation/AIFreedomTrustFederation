# AIFT-Forge Provider Architecture

AIFT-Forge now treats the local provider registry as the canonical inference layer.

## Principles

- No direct UI calls to model runtimes
- No cloud fallback
- No required API keys
- Localhost or private LAN only
- Provider registry is user-owned JSON
- Provider adapters hide runtime-specific APIs
- Capability negotiation determines routing

## Supported Provider Types

- `ollama`
- `llama-cpp`
- `openai-compatible-local`

## Capabilities

Providers may advertise or infer capabilities:

- `health`
- `models`
- `chat`
- `completion`
- `embeddings`
- `vision`
- `tools`

## Commands

    aift-forge ai status
    aift-forge ai models
    aift-forge ai chat --model llama3.2 --prompt Say hello
    aift-forge ai complete --model llama3.2 --prompt Once upon a time

## Architecture

    .forge/providers/*.json
            ↓
    provider registry
            ↓
    provider health
            ↓
    capability negotiation
            ↓
    provider router
            ↓
    adapter
            ↓
    local runtime HTTP API

## Android / Termux

Android/Termux uses the same router and registry, but avoids desktop native inference dependencies.

Termux should use HTTP-based local providers:

- Ollama on localhost or private LAN
- llama.cpp server
- OpenAI-compatible local server

