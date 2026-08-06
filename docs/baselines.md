# Baselines — recorded 2026-08-06 (T0.1)

Recorded before any Phase 0 work. Re-measure after each phase and diff against this file.

## How these were produced

```bash
npm run build
```

**Note on the command.** `CLAUDE.md` and `docs/improvement-plan.md` both specify `pnpm`.
This repo has a `package-lock.json`, no `pnpm-lock.yaml`, and `pnpm` is not installed on the
build machine. Every command in this file is the npm equivalent. Either install pnpm and
migrate the lockfile, or change the docs — right now the documented commands do not run.

Also absent from `package.json`: `typecheck`, `test:e2e`, `analyze`. `pnpm typecheck` and
`pnpm lint` appear in the CLAUDE.md definition of done; only `lint` exists (`next lint`).
Type checking currently only happens as part of `next build`.

## Environment

| | |
|---|---|
| Next.js | 14.2.18 |
| Node | v25.2.1 |
| npm | 11.6.2 |
| Build result | ✅ success, 30/30 static pages generated, no type errors |
| Bundle analyzer | not installed (`@next/bundle-analyzer` absent) — sizes below are `next build`'s own report |

## Shared JS

| Chunk | Size |
|---|---|
| `chunks/fd9d1056-*.js` | 53.6 kB |
| `chunks/2117-*.js` | 31.6 kB |
| other shared | 1.97 kB |
| **First Load JS shared by all** | **87.2 kB** |
| Middleware | 37.4 kB |

87.2 kB shared is the floor every route pays. Any Phase 1 primitive that lands in the shared
chunk moves this number; watch it.

## Per-route JS

Sorted by First Load JS descending. `ƒ` = dynamic (server-rendered on demand), `○` = static.

| Route | Render | Route JS | First Load JS |
|---|---|---|---|
| `/test/attempt/[attemptId]` | ƒ | 13.3 kB | **320 kB** |
| `/results/[attemptId]/review` | ƒ | 6.65 kB | **290 kB** |
| `/admin/questions/[id]` | ƒ | 199 B | **288 kB** |
| `/admin/questions/new` | ƒ | 187 B | **288 kB** |
| `/dashboard` | ƒ | 7.87 kB | 140 kB |
| `/account` | ƒ | 5.73 kB | 138 kB |
| `/admin/questions` | ƒ | 8.17 kB | 122 kB |
| `/admin/tests` | ƒ | 6.14 kB | 117 kB |
| `/admin/users/[id]` | ƒ | 5.71 kB | 117 kB |
| `/login` | ○ | 4.02 kB | 109 kB |
| `/reset-password` | ○ | 4.82 kB | 109 kB |
| `/signup` | ○ | 4.53 kB | 109 kB |
| `/admin/import` | ƒ | 6.73 kB | 108 kB |
| `/admin/tests/[id]` | ƒ | 6.13 kB | 107 kB |
| `/forgot-password` | ○ | 3.69 kB | 104 kB |
| `/test/[testId]/start` | ƒ | 3.3 kB | 104 kB |
| `/` | ƒ | 209 B | 94.2 kB |
| `/practice` | ƒ | 209 B | 94.2 kB |
| `/results/[attemptId]` | ƒ | 208 B | 94.2 kB |
| `/admin` | ƒ | 209 B | 94.2 kB |
| `/admin/analytics/items` | ƒ | 209 B | 94.2 kB |
| `/admin/attempts` | ƒ | 209 B | 94.2 kB |
| `/admin/attempts/[id]` | ƒ | 209 B | 94.2 kB |
| `/admin/groups` | ƒ | 209 B | 94.2 kB |
| `/admin/groups/[id]` | ƒ | 209 B | 94.2 kB |
| `/admin/users` | ƒ | 209 B | 94.2 kB |
| `/admin/tests/new` | ƒ | 1.63 kB | 88.8 kB |
| `/_not-found` | ○ | 876 B | 88.1 kB |
| all `/api/**` | ƒ | 0 B | 0 B |

### Read of these numbers

- **`/admin/questions/new` and `/admin/questions/[id]` at 288 kB is the anomaly.** Their own
  route JS is ~200 B, so the payload is entirely the question form's dependency tree —
  KaTeX + `react-katex` shipped to the client for live preview. This is the single largest
  cheap win in the bundle and is exactly what plan §10.2 describes.
- **`/results/[attemptId]/review` at 290 kB** is the same KaTeX cost, on a *student* route.
- **`/test/attempt/[attemptId]` at 320 kB** is KaTeX plus the 1,589-line interface. Desmos is
  loaded from an external script at calculator-open time, so it is not in this number.
- `/` at 94.2 kB is fine and is not the problem the plan implies; the landing page is an RSC
  with almost no client JS. Landing perf work should target LCP/CLS and the animated
  background, not bundle size.

## Not captured (tooling absent)

These were listed in plan §0.6 and cannot be recorded yet. Each needs a tool added first.

| Baseline | Blocker |
|---|---|
| Lighthouse mobile + desktop for `/`, `/login`, `/dashboard` | needs a running deploy / local server + Lighthouse CI |
| `axe` violations per route | no axe tooling installed |
| Per-route bundle *composition* | `@next/bundle-analyzer` not installed, no `analyze` script |
| Product metrics (signup → first attempt, D7 return, abandon rate per test) | no analytics/event pipeline exists; `AttemptEvent` only records blur/focus/fullscreen |

The product metrics in §0.6 and Appendix D are not a measurement task — they are a build task.
There is no funnel instrumentation in this codebase at all. Treat that as its own work item.
