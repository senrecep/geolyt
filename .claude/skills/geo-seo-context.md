---
name: geo-seo-context
description: Load GeoSEO project context efficiently. Use at session start to orient without reading the full codebase. Outputs: current phase, active task, key file locations.
---

# GeoSEO Context Loader

## Usage
Invoke this skill at the start of any session to orient quickly.

## Steps

1. Read `plans/index.md` — current phase status and active task
2. Read `plans/phase-N.md` for the current active phase only
3. Report: current phase, next task, key files to touch

## Output Format

```
## Session Context

**Current Phase:** Phase N — [name]
**Active Task:** [task description]
**Status:** [not started / in progress / blocked]

**Key files for this task:**
- packages/X/src/Y.ts
- packages/X/src/Z.ts

**Don't forget:**
- tsentials Result<T> for all functions
- No AI in packages/core
- Run: bun test packages/X before marking complete
```

## Token Budget

This skill reads max 2 files (index.md + current phase file). Total: ~200-400 tokens.
Do NOT read the full codebase. Do NOT read all phase files.
