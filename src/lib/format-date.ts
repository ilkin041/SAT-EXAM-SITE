/**
 * Deterministic date formatting.
 *
 * `toLocaleDateString()` / `toLocaleString()` with no locale read the
 * *runtime's* default, and the two runtimes disagree. This Node process
 * resolves to `az`, a browser to whatever the reader configured, so the same
 * timestamp rendered "5 avq 2026" from a server component and "8/6/2026" from a
 * client one. Where a client component formatted a date it had been handed as
 * server-rendered HTML, React reported a hydration mismatch outright — that was
 * `admin/questions/_components/questions-table.tsx`, two console errors on
 * every visit to `/admin/questions`.
 *
 * So both the locale and the time zone are pinned here.
 *
 *  - **Locale `en-GB`, hardcoded on purpose.** Localisation is an open decision
 *    in `CLAUDE.md`; when it is made, this file is where it gets made. Picking
 *    up the *server's* locale by accident is not the same as shipping
 *    Azerbaijani, and it must not be mistaken for it.
 *  - **Time zone UTC.** The stored instant is the fact. A tutor in Baku and a
 *    student in Berlin comparing the same attempt need to be reading the same
 *    row, and a date that shifts by reader turns "started 27 May" into an
 *    argument. `formatDateTime` says `UTC` out loud for the same reason — a
 *    bare clock time that silently is not the reader's own is worse than no
 *    time at all.
 *
 * `Intl.DateTimeFormat` instances are constructed once: building one is the
 * expensive part, and these render inside table-row loops.
 */

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** `6 Aug 2026`. Use for anything where the day is the whole point. */
export function formatDate(value: Date | string | number): string {
  return DATE.format(new Date(value));
}

/**
 * `6 Aug 2026, 08:14 UTC`. Use where the clock time carries information — an
 * attempt's start, an event log — not merely to look precise.
 */
export function formatDateTime(value: Date | string | number): string {
  return `${DATE_TIME.format(new Date(value))} UTC`;
}

/** `6 Aug`. Axis ticks and other places already carrying the year. */
export function formatDayMonth(value: Date | string | number): string {
  return DAY_MONTH.format(new Date(value));
}
