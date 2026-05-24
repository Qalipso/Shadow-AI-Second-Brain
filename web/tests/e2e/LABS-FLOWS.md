# Labs E2E flow map (shadow/web)

12 spec files added for the Self-Knowledge Laboratory.

## Run

```bash
cd shadow/web
npx playwright test                # full suite (auth + anon)
npx playwright test labs-          # labs subset only
npx playwright test app-shell-nav  # sidebar nav only
npx playwright show-report
```

Auth-gated specs are skipped unless `E2E_EMAIL` + `E2E_PASSWORD` are exported
and Supabase is configured.

## Spec map

| File                            | Coverage                                                            |
|---------------------------------|---------------------------------------------------------------------|
| `app-shell-nav.spec.ts`         | Every sidebar item: Today, Inbox, Check-in, Interventions, Life Circle, Direction, Rituals, Journey, Insights, Memory, Labs, Settings |
| `labs-load.spec.ts`             | `/labs` mounts cleanly: no auth-loop, no console errors, hero copy  |
| `labs-empty-state.spec.ts`      | Zero-progress copy ("Begin your first scan"), no dead CTAs          |
| `labs-index-progress.spec.ts`   | Ring % matches `completed / total`, persists across reload          |
| `labs-start-scan.spec.ts`       | Card → detail → Start CTA fires `POST /api/labs/sessions`           |
| `labs-test-flow.spec.ts`        | Full module: questions, Next/Back, Submit (auth-required)           |
| `labs-question-types.spec.ts`   | Scale widget renders + selectable, endpoints labeled                |
| `labs-results.spec.ts`          | Result summary, interpretation, retake CTA (auth-required)          |
| `labs-disclaimer.spec.ts`       | "Not a medical diagnosis" present + no clinical terms in copy       |
| `labs-memory-save.spec.ts`      | Explicit consent affordance, saved signal echoed in `/memory`        |
| `labs-local-mode.spec.ts`       | Dev/local mode announced honestly, localStorage persists progress   |
| `labs-errors.spec.ts`           | Bogus slug 404, API 500, 401, offline, hostile localStorage         |

Each spec uses `helpers.ts:isSupabaseAvailable()` to self-skip when the
environment doesn't fit (anonymous vs authenticated flows are partitioned).
