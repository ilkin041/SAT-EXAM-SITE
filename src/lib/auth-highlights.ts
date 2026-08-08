/**
 * What the auth pages' brand panel says, as data (T4.1).
 *
 * The panel used to hold an icon, two lines and a pill — half a screen spent on
 * "Your personalized SAT prep platform", which is a sentence, not a reason. One
 * array now fills it on all four pages, so the four cannot drift apart.
 *
 * **The panel was given this list rather than a rotating question stem**, which
 * was the other option on the table. Three reasons, in order:
 *
 *  1. Only a `publicDemo` question may appear on the open web (open decision 4),
 *     and the landing page's demo already shows those three — interactively, one
 *     scroll above the `Sign up` link that leads here. Showing the same three
 *     again, unanswerable, is a downgrade of the same asset.
 *  2. Rotation is state plus a timer, so it is a client island on four routes
 *     that currently ship nothing but their form. `/` pays for its demo once
 *     and converts on it; an auth page has already converted.
 *  3. `/forgot-password` and `/reset-password` are recovery flows. A practice
 *     question beside "set a new password" is noise. What the account holds is
 *     at least addressed to why the reader is here.
 *
 * Every entry names the route it lives at, for the same reason `tutor-features.ts`
 * does: it makes the claim checkable by whoever edits this file next, and each
 * one was read before it was written. Nothing here is aspirational — note that
 * there is no `/progress` route yet, so no line claims one.
 *
 * Pure data, no imports. Icons are chosen at the call site.
 */

export interface AuthHighlight {
  id: string;
  /** The mono eyebrow. Two or three words, sentence case. */
  label: string;
  /** One line under it. A fact about the product, not a promise. */
  detail: string;
  /** Where it lives. Never rendered — it is proof. */
  route: string;
}

export const AUTH_HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    id: "timing",
    label: "Timed modules",
    // `moduleDeadlineAt` is authoritative and indexed for the cron sweeper.
    detail:
      "The clock belongs to the server, so reloading the page buys you no time and losing the tab loses no work.",
    route: "/test/attempt/[attemptId]",
  },
  {
    id: "tools",
    label: "The same tools",
    detail:
      "Answer eliminator, passage highlighting with notes, the Desmos graphing calculator and the geometry reference sheet.",
    route: "/test/attempt/[attemptId]",
  },
  {
    id: "scoring",
    label: "Scaled scoring",
    detail:
      "Each section converts from raw score to scaled, broken down by content domain and by difficulty.",
    route: "/results/[attemptId]",
  },
  {
    id: "review",
    label: "Every answer explained",
    detail:
      "Walk back through the test question by question: what you chose, what was right, and why.",
    route: "/results/[attemptId]/review",
  },
  {
    id: "history",
    label: "Your attempts, kept",
    detail:
      "Completed tests stay on your dashboard with the score trend across them. This is what the account is for.",
    route: "/dashboard",
  },
];
