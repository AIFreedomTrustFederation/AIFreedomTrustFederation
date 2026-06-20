# AIFT Forge Open Source Dependency Stack

AIFT Forge uses open-source dependencies as replaceable modules, not as permanent points of failure.

## Dependency rules

1. Every dependency must support a local-first or self-hosted deployment path.
2. No dependency may be the only way the system can operate.
3. Package-time manifests must list installed dependencies and fallback mappings.
4. Optional external systems must be adapter-based and disabled unless configured.
5. Security-sensitive dependencies must be reviewed before stable release promotion.
6. Deprecated dependencies must have a migration target before removal.

## Core web/runtime stack

| Capability            | Primary                        | Backup                                     |
| --------------------- | ------------------------------ | ------------------------------------------ |
| Web app               | Vite + React + TypeScript      | Static HTML fallback and local records     |
| API server            | Fastify-ready                  | Hono-ready, raw Node HTTP current fallback |
| Validation            | Zod                            | Manual validation helpers                  |
| Storage               | SQLite/libSQL + Drizzle-ready  | better-sqlite3, sqlite-wasm, JSON store    |
| Offline collaboration | Yjs                            | @automerge/automerge, append-only records  |
| Desktop               | Electron current, Tauri target | Browser/PWA fallback                       |
| Mobile                | Capacitor/Tauri mobile target  | Browser/PWA and Android shell fallback     |

## Repo engine stack

| Capability        | Primary                      | Backup                           |
| ----------------- | ---------------------------- | -------------------------------- |
| Git compatibility | native Git smart HTTP bridge | isomorphic-git, simple-git       |
| Git inspection    | native Git commands          | isomorphic-git object reads      |
| Repo identity     | AIFT manifests               | Git remote URL mirror            |
| Artifact hashes   | Node crypto SHA-256          | noble hashes                     |
| Repo archive      | AIFT release manifests       | tar/zstd-compatible archive plan |

## Local AI stack

| Capability            | Primary                                 | Backup                                             |
| --------------------- | --------------------------------------- | -------------------------------------------------- |
| Easy local inference  | Ollama-compatible local API             | llama.cpp-compatible local API                     |
| Edge inference        | llama.cpp-compatible local API          | @huggingface/transformers / ONNX runtime           |
| GPU/VPS inference     | vLLM-compatible local API               | SGLang-compatible local API                        |
| Structured generation | SGLang-compatible local API             | JSON schema post-validation                        |
| Embeddings            | @huggingface/transformers / local model | Ollama-compatible embeddings, manual keyword index |
| Vector search         | LanceDB                                 | sqlite-vec, keyword index                          |

## Observability stack

| Capability | Primary                          | Backup                     |
| ---------- | -------------------------------- | -------------------------- |
| Metrics    | prom-client                      | health/state routes        |
| Traces     | OpenTelemetry                    | local JSON audit log       |
| Logs       | local JSON audit log             | stdout/stderr process logs |
| Dashboards | Grafana-compatible future output | built-in Forge dashboard   |

## QA/security/release stack

| Capability             | Primary                     | Backup                                |
| ---------------------- | --------------------------- | ------------------------------------- |
| Unit tests             | Vitest                      | node smoke tests                      |
| Browser tests          | Playwright                  | manual QA checklist                   |
| Lint                   | ESLint                      | TypeScript compiler and manual review |
| Formatting             | Prettier                    | manual formatting                     |
| SBOM                   | CycloneDX npm               | AIFT dependency manifest              |
| License review         | license-checker-rseidelsohn | package manifest review               |
| Vulnerability scanning | osv-scanner external CLI    | manual advisory review                |
| Static security review | Semgrep external CLI        | manual code review                    |

## Packaging requirement

Every packaged AIFT Forge release must include:

- `dist/aift-forge-dependencies.json`
- SBOM when CycloneDX is available
- release manifest
- artifact hashes
- approval record
- dependency fallback summary
- known unavailable optional integrations

## Security warning

Adding a dependency does not make it trusted. Dependencies are considered candidates until they pass:

- license review
- vulnerability scan
- integration test
- fallback test
- release approval
