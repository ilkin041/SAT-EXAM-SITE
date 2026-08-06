# Commercial readiness boundaries

## Anonymous practice

`/practice` is the unauthenticated sample funnel. It lists only public tests whose
modules are ready to serve. Private and paid tests must remain private and be
granted through ownership or group assignment.

An anonymous attempt is bound to one browser by the signed, HTTP-only
`sat_anonymous_attempt` cookie. The attempt ID is not sufficient to read or mutate
the attempt. The cookie expires after 30 days, and starting a second anonymous
attempt replaces the binding to the first. This is a sample-session capability,
not an identity or a substitute for an account.

## Integrity telemetry, not proctoring

Attempt events are stored as append-only rows so concurrent browser events cannot
overwrite one another. The current signals are limited to document blur/focus and
fullscreen enter/exit. The start button makes a best-effort fullscreen request,
but browsers and students can decline or leave it, and the warning is advisory.

The duplicate-tab check uses `BroadcastChannel`. It helps prevent accidental tabs
within one browser storage partition; it does not cross private windows, browser
profiles, browsers, or devices. Copy/paste, developer tools, right-click, print,
and every form of window switching are not reliably detected. Pending requests
from a duplicate tab are not revoked.

Treat these events as review signals only. Do not advertise the platform as
proctored or use the event count as an automatic cheating verdict. A higher-stakes
commercial product would need an explicit integrity policy and stronger,
server-enforced session/device controls (or a dedicated proctoring system).

## Stored rich content

Question HTML is stored raw because authors are trusted administrators. Current UI
consumers render it through `RichContent`, which runs the KaTeX pipeline and a
strict `sanitize-html` allowlist. This is a render-time boundary, not a database
invariant.

Any future API, CSV field, email, feed, or alternate renderer that includes stems,
passages, choices, or explanations must sanitize through the same approved path.
If non-admin authoring is introduced, sanitize and validate on write as well as on
render. The existing attempt CSV intentionally does not export raw question HTML.
