# Contributing to Shadow

> Shadow is currently single-user / dogfooded. External contributions welcome but not yet actively solicited. Open an issue first if proposing significant changes.

---

## Dev Setup

See [README.md → Quick Start](./README.md#quick-start).

---

## Branch & PR Workflow

- `main` is always deployable
- Work on feature branches: `feat/<short-name>`, `fix/<short-name>`, `refactor/<short-name>`
- Open PR against `main`
- Self-review your diff before requesting review
- All checks must pass (typecheck, lint, tests, build)
- Squash-merge with a clean commit message

### Commit message format (Conventional Commits)

```
<type>(<optional-scope>): <imperative description>

<optional body explaining why, not what>
<optional footer with breaking changes, issue refs>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `build`, `style`.

Example:
```
feat(interventions): hide action buttons on completed cards

When a card's status is "completed", the hero + lifecycle buttons are
hidden so the user sees only the quest content + final unlock.
```

---

## Code Style

### Immutability (mandatory)
Always create new objects/arrays; never mutate. See [ADR-009](./DECISIONS/009-immutability-in-components.md).

```ts
// ❌
items.push(item);
setItems(items);

// ✅
setItems([...items, item]);
```

### File organization
- Feature folders under `src/components/` (e.g. `inbox/`, `direction/`, `labs/`)
- Server-only modules use `import 'server-only'` at top
- Max ~400 lines per file; split when growing past 800

### Naming
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Server lib: `kebab-case.ts` in `src/lib/`
- Types: `PascalCase` for types/interfaces, no `I` prefix

### TypeScript
- Strict mode; no `any` without comment justifying why
- Prefer `type` over `interface` for data shapes
- Discriminated unions for state machines (`type Status = "draft" | "active" | ...`)

### No emojis in code
Comments, file content, commits — no emojis. (User preference baked in via `~/.claude/CLAUDE.md`.)

---

## Testing

- Unit tests (Vitest) for `src/lib/` pure functions
- Component tests for tricky state hooks
- Playwright E2E for: auth, capture → classify → dashboard render, check-in wizard
- New features should ship with tests in the same PR

```bash
npm run test         # vitest watch
npm run test:run     # vitest one-shot
npm run test:e2e     # playwright
npm run typecheck    # tsc --noEmit
```

---

## Security Checklist (before every commit)

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] Server-only modules import `server-only`
- [ ] New tables include RLS policies in the migration
- [ ] User inputs validated at API route boundary
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Error messages don't leak sensitive data
- [ ] Cost ledger written for every new LLM call site

If you find a security issue, **do not open a public issue** — email `security@<placeholder>` directly.

---

## Adding a New Feature

1. Sketch the user flow → propose in an issue
2. If architectural impact: write an [ADR](./DECISIONS/) draft (status: `Proposed`)
3. Plan the schema changes; add a Supabase migration
4. Write the API route(s) + server lib code
5. Write the UI component(s)
6. Add tests
7. Update [ROADMAP.md](./ROADMAP.md) status
8. Open PR

---

## Adding a New Migration

1. Create file: `supabase/migrations/YYYYMMDD_<short_name>.sql`
2. Include both DDL and RLS in the same file
3. Test locally: `supabase db reset && supabase db push`
4. Document in `db/README.md` if adding a new table

---

## Adding a New Prompt

Prompts live in two places:
- `ai/prompts/NN-<name>.md` — versioned markdown source of truth
- `src/ai/prompts/<name>.ts` — TypeScript export consumed by API routes

Any prompt change is a PR-worthy event. Include in the PR:
- Updated markdown file with version bump
- Updated TypeScript export
- Sample input/output in PR description
- Cost delta estimate if model or length changes

---

## Adding a New ADR

```bash
cp DECISIONS/_TEMPLATE.md DECISIONS/0NN-short-title.md
```

Fill template. Add to index in `DECISIONS/README.md`. Status: `Proposed` → flip to `Accepted` on merge.

---

## Adding a New Flow Doc

Use when adding a multi-step user journey or significant async pipeline.

```bash
cp FLOWS/_TEMPLATE.md FLOWS/00N-flow-name.md
```

Include Mermaid sequence diagram + files touched + edge cases.

---

## Reporting Bugs

Open an issue with:
- What you did
- What you expected
- What happened
- Screenshots if visual
- Browser/OS if frontend
- Any console errors

Use labels: `bug`, `ui`, `ai`, `db`, `infra`.

---

## Questions

Open a discussion or DM the maintainer.
