# Feature decisions

## AI explanations: removed (2026-08-06)

`POST /api/ai/explain` proxied Gemini, but built its entire prompt from the request body —
`questionStem`, `choices`, `correctAnswer` and `studentResponse` were all client-supplied and the
server never loaded the question from the database. Any authenticated user could send arbitrary
text to the model on the project's API key, at 20 requests/minute. The feature was removed rather
than repaired: fixing it required server-side question lookup, response caching, and a cost
ceiling, none of which were built, and the same student need is met by the authored
`Question.explanation` field.

Removed: the route, the review page's "Ask AI Tutor" button and its loading/error/rate-limit UI,
`GEMINI_API_KEY` and `GEMINI_MODEL`. No Prisma model, column, or migration referenced the feature.
The rate limiter (`src/lib/rate-limit.ts`) is retained — six other call sites use it.

Answer review now renders the authored explanation when one exists and nothing when it doesn't.
The empty state is an open design question; see the coverage numbers in the removal report.

## Groups: keep

Groups are the authorization and assignment primitive for private tests. They
remain a supported feature even while production usage is zero, because paid or
institution-assigned tests need this boundary. Phase 5 adds member progress and
group-level score aggregates to the existing membership and assignment UI.

## Annotations: keep and surface

Passage highlighting and notes are a core digital-test study behavior. The zero
row count was treated as a discoverability problem rather than evidence that the
feature has no value. The attempt passage now explains that selected text can be
highlighted or annotated, displays a saved count, and completed-answer review
loads the same persisted annotations.
