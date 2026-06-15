# AIFT Forge AI Integration

AIFT Forge must include a first-class AI layer for code, repo operations, release management, support, and node federation.

The AI layer should support ChatGPT/OpenAI-compatible providers, local models, private relay models, and future AIFT-owned agents without hardcoding any single provider as mandatory.

## Core principle

AI should assist the operator. It should not silently own the repo, publish releases, merge code, leak secrets, or perform irreversible actions without human approval.

## Provider model

AIFT Forge should support multiple provider types:

- OpenAI-compatible API provider
- local model provider
- private relay model provider
- offline rules engine
- future AIFT-native model provider

Provider settings must be stored outside public source code. API keys, tokens, private model credentials, and signing keys must never be committed.

## Required AI surfaces

### Repo assistant

Helps users understand a repository:

- summarize repository purpose
- explain file structure
- identify framework
- identify build commands
- identify missing requirements
- suggest next steps

### Code review assistant

Helps review pull requests:

- summarize changed files
- identify risky changes
- identify missing tests
- identify security-sensitive changes
- produce review comments
- prepare approval or requested-changes drafts

### Issue triage assistant

Helps manage issues:

- summarize issue body
- classify bug, feature, support, security, docs, build, release, node, mirror, or package
- suggest labels
- suggest assignees
- detect duplicate or related issues
- draft response

### Build failure assistant

Helps diagnose failed builds:

- parse logs
- identify first meaningful failure
- classify missing dependency, syntax error, type error, runtime error, network issue, permissions issue, or resource limit
- suggest fix path

### Release assistant

Helps prepare releases:

- summarize commits
- draft changelog
- identify breaking changes
- collect artifact list
- verify hash and signing status
- draft release notes

### Security assistant

Helps detect high-risk patterns:

- possible secrets
- unsafe dependencies
- public/private boundary mistakes
- missing approval gates
- unauthenticated destructive actions
- misleading security claims

### Docs assistant

Helps maintain documentation:

- generate README sections
- update install instructions
- explain architecture
- generate API docs
- maintain troubleshooting guides

### Node and federation assistant

Helps manage AIFT-specific infrastructure:

- summarize node health
- explain mirror status
- identify stale nodes
- identify failed replication
- recommend safe fallback route
- prepare operator report

## Human approval gates

AI must require approval before:

- merging a pull request
- publishing a release
- signing an artifact
- changing access control
- changing repo visibility
- deleting files or repos
- rotating keys
- pushing to public mirrors
- promoting a package to stable
- changing node routing

## AI request record

Every AI request should eventually produce a local record:

```json
{
  "ai_request_id": "aireq-1",
  "repo_id": "aift-root",
  "agent": "repo-assistant",
  "provider_type": "openai-compatible",
  "input_scope": "repo-summary",
  "risk_level": "low",
  "status": "completed",
  "human_approval_required": false,
  "created_at": "ISO_DATE"
}
```

## AI output record

Every AI output should be traceable:

```json
{
  "ai_output_id": "aiout-1",
  "ai_request_id": "aireq-1",
  "summary": "Repository purpose summarized.",
  "confidence": "working",
  "requires_review": true,
  "created_at": "ISO_DATE"
}
```

## No-secret rule

AI prompts must not include secrets, private keys, credentials, tokens, or private user data unless the operator explicitly authorizes a scoped private action and the system records that approval.

## Long-term goal

AIFT Forge should feel like a repo platform with an expert maintainer inside it: able to explain, review, triage, document, diagnose, and prepare actions while leaving control with the human operator.
