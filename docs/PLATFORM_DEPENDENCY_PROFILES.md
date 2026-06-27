# AIFT-Forge Platform Dependency Profiles

AIFT-Forge supports different dependency profiles for different operating environments.

## Android / Termux

Android and Termux report `process.platform` as `android`. Many desktop native Node packages do not publish Android binaries.

The Android profile uses:

- portable JavaScript packages
- local filesystem records
- JSON / JSONL data stores
- HTTP provider registry inference
- Ollama, llama.cpp, or local OpenAI-compatible endpoints

The Android profile must not require:

- `onnxruntime-node`
- `@lancedb/lancedb`
- `lancedb`
- `libsql`
- `@libsql/client`
- `better-sqlite3`
- `sqlite3`
- `sharp`

## Desktop Node

Desktop Node may use optional native dependencies where supported.

Desktop-native dependencies are preserved under `aiftDesktopDependencies` and may be restored into optional dependencies on Linux, macOS, or Windows.

## Commands

Show active profile:

    npm run deps:profile

Validate dependency profile:

    npm run deps:doctor

Install using platform-aware policy:

    npm run deps:install

Run full platform pipeline:

    ./scripts/aift-platform-pipeline.sh
