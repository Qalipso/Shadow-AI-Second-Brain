# Shadow — Web

Next.js 16 + Tailwind v4 + React 19. Dark-only. Memory-conservative.

## Dev

```bash
npm install
npm run dev          # cap = 2GB heap, no wrapper
# or
npm run dev:safe     # wrapper: pre-flight + auto-restart on OOM
```

Server: <http://localhost:3007>

## Layout

- `src/app/(app)/*` — authed app shell (Sidebar + Orb).
- `src/app/error.tsx` — per-route boundary.
- `src/app/global-error.tsx` — root crash boundary.
- `src/app/not-found.tsx` — 404.
- `scripts/dev-safe.sh` — crash-resilient dev launcher.

## Memory profile

- Single sans (Geist) + display (Fraunces, 400/600 only).
- No Geist Mono, no variable axes.
- `NODE_OPTIONS=--max-old-space-size=2048`.
- No recharts, supabase, base-ui, shadcn npm pkg — wire in as needed.
