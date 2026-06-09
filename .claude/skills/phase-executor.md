---
name: phase-executor
description: Execute a specific task from the current phase plan. Reads the phase file, implements exactly one task, marks it complete, updates plans/index.md. Token-efficient — targets only the files needed for the task.
---

# Phase Task Executor

## Usage
```
/phase-executor [task description or task number]
```

## Steps

1. Read `plans/index.md` to find current phase
2. Read `plans/phase-N.md` to find the specific task
3. Identify the exact files to create/modify (no more, no less)
4. Implement the task following AGENTS.md rules:
   - tsentials Result<T> always
   - Biome-compatible TypeScript
   - No AI in packages/core
   - No stub implementations
5. Run `bun test packages/X` to verify
6. Mark task `[x]` in `plans/phase-N.md`
7. Update `plans/index.md` Session Log

## Token Efficiency Rules

- Read only files directly needed for the task
- Use `grep` to find symbols instead of reading full files
- After implementing, run targeted tests (not full suite)
- Mark complete and stop — do not continue to next task

## What NOT to do

- Do not read all packages at session start
- Do not implement multiple tasks in one session
- Do not add features beyond what the task requires
- Do not leave TODO comments in code
