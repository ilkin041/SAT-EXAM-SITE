import type { AnalyticsEventName } from "@/lib/analytics-events";

/**
 * Funnel arithmetic for `/admin/analytics` (T2.3). Pure — no Prisma, no React —
 * so the percentages are pinned by `tests/analytics-events.test.ts` rather than
 * by looking at the page.
 *
 * The full analytics page is T10.1. This is the one query that makes the
 * pipeline worth having on the day it ships: are people who start a test
 * finishing it, and do they look at the report afterwards.
 */

/**
 * The one chain in the catalogue that is genuinely sequential. `signup` is not
 * in it — an anonymous visitor can take a public test without one, so putting
 * it at the top would report every anonymous attempt as an infinite conversion.
 */
export const TEST_TAKING_CHAIN: readonly {
  name: AnalyticsEventName;
  label: string;
}[] = [
  { name: "attempt_started", label: "Started a test" },
  { name: "attempt_submitted", label: "Submitted it" },
  { name: "results_viewed", label: "Viewed the report" },
  { name: "review_opened", label: "Opened review" },
];

export interface FunnelRow {
  name: AnalyticsEventName;
  label: string;
  count: number;
  /** Share of the first step. NULL when the first step is 0. */
  shareOfFirst: number | null;
  /** Share of the step above. NULL for the first row, or when that step is 0. */
  shareOfPrevious: number | null;
}

/**
 * `counts` is keyed by event name; a name with no rows may be absent.
 *
 * Percentages are 0–100 and rounded to one decimal, because the page shows one
 * decimal and rounding at the edge is how two views of the same number end up
 * disagreeing.
 */
export function computeFunnel(
  steps: readonly { name: AnalyticsEventName; label: string }[],
  counts: Partial<Record<AnalyticsEventName, number>>,
): FunnelRow[] {
  const first = counts[steps[0]?.name] ?? 0;
  return steps.map((step, index) => {
    const count = counts[step.name] ?? 0;
    const previous = index === 0 ? null : counts[steps[index - 1].name] ?? 0;
    return {
      name: step.name,
      label: step.label,
      count,
      shareOfFirst: first > 0 ? round1((count / first) * 100) : null,
      shareOfPrevious:
        previous === null || previous === 0 ? null : round1((count / previous) * 100),
    };
  });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Inclusive-start, exclusive-end window ending now. `days` must be positive. */
export function windowStart(days: number, now = new Date()): Date {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - Math.max(1, Math.floor(days)));
  return start;
}

export const FUNNEL_WINDOWS = [7, 30, 90] as const;
export type FunnelWindow = (typeof FUNNEL_WINDOWS)[number];

export function parseWindow(raw: string | undefined): FunnelWindow {
  const parsed = Number(raw);
  return (FUNNEL_WINDOWS as readonly number[]).includes(parsed)
    ? (parsed as FunnelWindow)
    : 30;
}
