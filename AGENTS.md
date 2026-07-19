# Perch - Codex Instructions

Read [`CLAUDE.md`](CLAUDE.md) before making architecture- or domain-sensitive
changes. It is the repository's canonical architecture reference, including
the current delivery status and locked technology choices. Use
[`docs/PROGRESS.md`](docs/PROGRESS.md) to confirm what is planned, active, or
shipped before starting a new effort.

## Agent skills

### Issue tracker

Issues and specs are tracked as local Markdown under
`.scratch/<feature-slug>/`. See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

### Triage labels

Triage uses the default canonical labels: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, and `wontfix`. See
[`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

This repository uses a single-context domain documentation layout. See
[`docs/agents/domain.md`](docs/agents/domain.md).
