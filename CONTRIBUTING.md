# Contributing to Geolyt

## Ways to Contribute

- Report a bug
- Propose a feature
- Submit a fix or improvement
- Improve documentation

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Bun ≥ 1.1
- Docker (Postgres, Redis, Firecrawl)
- A Google Cloud account (for Gemini API key)

### Setup

```bash
git clone https://github.com/senrecep/geolyt.git
cd geolyt
bun install
cp .env.example .env   # fill in your values
docker compose up -d
bun run db:migrate
bun run dev
```

## Development Workflow

1. Fork the repository
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run checks: `bun run lint && bun run typecheck && bun run test`
5. Commit using conventional format (see below)
6. Open a pull request

## Commit Format

```
feat(scope): description      # new feature
fix(scope): description       # bug fix
refactor(scope): description  # no behavior change
test(scope): description      # tests only
docs(scope): description      # documentation only
chore(scope): description     # build, config, tooling
```

Scopes: `api`, `core`, `ai-core`, `jobs`, `web`, `shared`, `deploy`, `docs`

Examples:
```
feat(core): add llms.txt validation scorer
fix(api): return 429 when quota exceeded
docs(readme): add setup instructions
```

## Code Standards

### Error Handling

All functions must return `Result<T>` or `ResultAsync<T>` from [tsentials](https://github.com/senrecep/tsentials). Do not throw, do not use `try/catch`.

```typescript
// Correct
function parse(raw: string): Result<Data> {
  return Result.try(
    () => JSON.parse(raw),
    () => Err.validation("Parse.Failed", "Invalid JSON"),
  )
}

// Wrong
function parse(raw: string): Data {
  return JSON.parse(raw) // throws — don't do this
}
```

### TypeScript

- `strict: true` — no exceptions
- No `any` — use `unknown` + type guard
- No `console.log` — use the pino logger
- No stub implementations (`return null`, empty functions, TODO in code)

### Scorers (`packages/core`)

Scoring functions must be deterministic and free of side effects. No AI/LLM calls in `packages/core`. Tests must cover all score ranges.

### Tests

Tests live in `src/__tests__/` and mirror the source structure. Run with `bun test`.

## Pull Request Guidelines

- One logical change per PR
- Include tests for new behavior
- Update documentation if the public interface changes
- Keep the PR description factual — what changed and why

## Reporting Bugs

Open an issue using the **Bug Report** template. Include:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment (Bun version, OS)

## Proposing Features

Open an issue using the **Feature Request** template before starting significant work. This avoids duplicate effort and ensures the change aligns with the project direction.
