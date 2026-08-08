# Event pipeline (T2.3)

**Date:** 2026-08-08 · **Task:** T2.3 · **Tables:** `AnalyticsSession`, `AnalyticsEvent`

Product metrics were not measurable before this. `AttemptEvent` records only
BLUR/FOCUS/FULLSCREEN_ENTER/EXIT inside a live test, which answers "did this student leave the
tab", not "do people who start a test finish it". This file is the record of what the pipeline
stores and why — **it is the source for the `/privacy` copy in T3.8.**

---

## What we store

Everything is first-party. It goes to our own Postgres. **There is no third-party analytics
script anywhere in the app**, no pixel, no tag manager, and nothing leaves the server.

### `AnalyticsSession` — one row per browser that did something countable

| Column | What it is |
|---|---|
| `id` | The `sat_sid` cookie value: a random UUID, minted in `middleware.ts`. Carries nothing about the person |
| `userId` | The account this browser was signed in as, when it was. NULL for anonymous |
| `deviceType` | `MOBILE` / `TABLET` / `DESKTOP` / `BOT` / `UNKNOWN`, derived from the User-Agent |
| `viewportWidth` | CSS pixels, sent by the client when an attempt starts |
| `userAgent` | The raw UA string, truncated to 512 chars |
| `createdAt` / `updatedAt` | Timestamps |

A row is created **lazily, by the first event of that session**. A visitor who reads the landing
page and leaves produces no row at all — the table is a record of activity, not of visits.

`userAgent` is the one fingerprinting-adjacent thing here. It is stored once per browser rather
than copied onto every event, and it never appears in `props`.

### `AnalyticsEvent` — one row per thing that happened

| Column | What it is |
|---|---|
| `id` | cuid |
| `sessionId` | FK to the session above |
| `userId` | Account id, or NULL for anonymous |
| `name` | One of the eleven below. TEXT, not an enum — a new event is a code change, not a migration |
| `props` | Scalar labels. **Never PII** |
| `createdAt` | Timestamp |

Append-only: nothing in the app updates or deletes a row.

### What we deliberately do **not** store

- No IP address, anywhere.
- No email, name, or any account field. Identity is a `userId` and nothing more.
- No student response text, no answer content, no annotation text.
- No third-party identifiers, no cross-site anything.
- No free text at all in `props` — values are capped at 120 characters and the guard drops
  anything email-shaped.

`sanitizeProps()` in `src/lib/analytics-events.ts` enforces the last two at the write, and
`tests/analytics-events.test.ts` pins the behaviour. A dropped key logs an error in development
so the call site gets fixed, and a warning in production — it never throws, because `track()`
must never fail a user action.

### Cookie

`sat_sid` — httpOnly, `SameSite=Lax`, `Secure` in production, 180 days, path `/`. httpOnly
means page scripts cannot read it. It exists so a signup can be joined to the attempt that
followed it; it is not used for advertising and there is nothing to sell.

---

## The eleven events

| Event | Where it fires | Props | Status |
|---|---|---|---|
| `signup_completed` | `api/auth/signup/route.ts`, after the user row is created | `providedName` | live |
| `onboarding_completed` | — | — | **awaiting T4.3** (`/welcome` does not exist) |
| `onboarding_skipped` | — | — | **awaiting T4.3** |
| `attempt_started` | `api/tests/[id]/start/route.ts`, after `startAttempt` | `attemptId`, `testId`, `mode`, `isPublic`, `anonymous` | live |
| `module_completed` | `api/attempts/[id]/submit-module/route.ts` | `attemptId`, `moduleId`, `testId`, `outcome` | live |
| `attempt_submitted` | same handler, when the submit completes the attempt | `attemptId`, `testId` | live |
| `attempt_abandoned` | start handler (`reason: "restarted"`) and `api/cron/attempts` (`reason: "expired"`) | `attemptId`, `testId`, `reason` | live |
| `results_viewed` | `results/[attemptId]/page.tsx`, after the access check | `attemptId`, `testId`, `anonymous` | live |
| `review_opened` | `results/[attemptId]/review/page.tsx`, after the access check | `attemptId`, `testId`, `anonymous` | live |
| `drill_started` | — | — | **awaiting T8.3** (`/drill` does not exist) |
| `drill_completed` | — | — | **awaiting T8.3** |

The four with no call site are catalogued, typed, and rendered on `/admin/analytics` with an
"Awaiting T4.3 / T8.3" badge, so a zero there reads as "the feature does not exist" rather than
"nobody did it". Wiring each is one `void track(...)` line when its feature ships.

---

## Rules for adding a call site

1. **`void track(...)`, never `await track(...)`.** The promise always resolves; the write is
   fire-and-forget on purpose. An analytics row is worth less than the request it would delay,
   and a failed insert must never be the reason a student's submission 500s.
2. **`props` are scalar labels.** Ids, enums, booleans, counts. If you are tempted to put text a
   person typed in there, the answer is no.
3. **Fire after the authorization check**, not before. `results_viewed` above the `notFound()`
   would count people who were refused the page.
4. **Add the name to `ANALYTICS_EVENTS` and to `FUNNEL_STEPS`.** The test asserts the two agree,
   so a new event cannot be invisible on the admin page.
5. **Server-side wherever the fact is server-observable.** Only `viewportWidth` comes from the
   client, and it rides on the attempt-start request rather than on a page-load beacon.

### The one caveat

`track()` fires without awaiting, so on a platform that freezes the process the moment the
response is sent, a write can be lost. This app runs a long-lived Node server, where it is not.
When the project moves to Next 15, wrap the body of `track()` in `after()` and the caveat goes
away — that is the whole fix.

## Known imprecision

- `results_viewed` and `review_opened` count **renders**, not unique readers. A refresh counts
  again. De-duplicating would need a read per render, and the funnel question is "did anyone
  look at this".
- Two genuinely simultaneous first submissions of the same module can both record
  `module_completed`; one of them loses the transaction. A rare over-count, chosen over a
  read-modify-write inside the request.
- An iPad in desktop mode reports a desktop Safari UA with no touch hint server-side, so it
  counts as `DESKTOP`. Not guessed around.
- Cron-produced events (`attempt_abandoned`, `reason: "expired"`) belong to the sentinel
  `system` session, which has no device.

---

## Retention

Nothing prunes these tables yet. `AnalyticsEvent.createdAt` is indexed for exactly that sweep;
setting a retention window is a T3.8 decision, because the number that goes in the privacy copy
and the number the job uses have to be the same one.
