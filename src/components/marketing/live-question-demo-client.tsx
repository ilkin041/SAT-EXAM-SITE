"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { RichHtml } from "@/components/rich-html";
import { Button } from "@/components/ui/button";
import {
  DEMO_STORAGE_KEY,
  buildDemoSummary,
  demoModuleLabel,
  formatDemoDuration,
  parseDemoProgress,
  toggleEliminated,
  type DemoAnswerRecord,
  type DemoChoiceLabel,
  type DemoQuestion,
  type DemoVerdict,
} from "@/lib/demo-question";
import { cn } from "@/lib/utils";

/**
 * The interactive half of the landing demo (T3.3).
 *
 * The geometry is the real test interface's, deliberately: the same 7×7 letter
 * disc, the same strike-through eliminator circle on the right of each row, the
 * same ABC toggle in the question header. That interaction is the product's
 * most distinctive one and nobody knows it exists, which is the entire reason
 * this section is on the landing page.
 *
 * What it does *not* copy is the Bluebook chrome's four hardcoded colours. That
 * exemption is scoped to `src/app/test/attempt/**` and this file is marketing:
 * every colour here is a token, so the demo follows the site's theme.
 *
 * Nothing is persisted server-side. Progress lives in `sessionStorage`, which
 * is per-tab and gone when the tab closes — deliberately weaker than
 * `/practice`'s HMAC-bound anonymous attempt, because a demo that half-restores
 * across devices is a support burden for something worth three questions.
 */

interface Props {
  questions: DemoQuestion[];
}

export function LiveQuestionDemoClient({ questions }: Props) {
  const total = questions.length;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DemoAnswerRecord[]>([]);
  const [selected, setSelected] = useState<DemoChoiceLabel | null>(null);
  const [eliminated, setEliminated] = useState<DemoChoiceLabel[]>([]);
  const [eliminatorActive, setEliminatorActive] = useState(false);
  const [verdict, setVerdict] = useState<DemoVerdict | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The timer starts on the first interaction, not on page load. A visitor who
   * scrolls past the section and never touches it has spent no time on it, and
   * a clock already running when they arrive is a pressure the demo has no
   * business applying.
   */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  /** Re-read once a second while the clock runs; the interval's only job. */
  const [now, setNow] = useState<number | null>(null);

  const question = questions[index];
  const finished = index >= total;

  // Restore in an effect rather than a lazy initialiser: the server renders
  // this component too, and reading `sessionStorage` during render would make
  // the first client paint disagree with the server's HTML.
  useEffect(() => {
    const stored = parseDemoProgress(
      window.sessionStorage.getItem(DEMO_STORAGE_KEY),
      questions.map((q) => q.id),
    );
    if (stored.answers.length > 0) {
      setAnswers(stored.answers);
      setIndex(Math.min(stored.index, questions.length));
    }
    // `questions` is a fresh array each render but its contents are server data
    // that cannot change without a navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (startedAt === null || verdict) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, verdict]);

  const beginTiming = useCallback(() => {
    setStartedAt((current) => current ?? Date.now());
  }, []);

  const priorMs = answers.reduce((sum, a) => sum + a.elapsedMs, 0);
  const runningMs =
    startedAt !== null && now !== null && !verdict ? Math.max(0, now - startedAt) : 0;
  const clockMs = priorMs + runningMs;

  async function submit() {
    if (!question || !selected || submitting) return;
    const elapsedMs = startedAt !== null ? Date.now() - startedAt : 0;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/demo/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, response: selected }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not check that answer. Try again.");
        return;
      }
      const result = (await res.json()) as DemoVerdict;
      setVerdict(result);

      const record: DemoAnswerRecord = {
        questionId: question.id,
        response: selected,
        correct: result.correct,
        elapsedMs,
      };
      const next = [...answers, record];
      setAnswers(next);
      try {
        window.sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ answers: next }));
      } catch {
        // Private mode, or a full quota. Losing the ability to resume a
        // three-question demo is not worth an error message.
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function advance() {
    setIndex((i) => i + 1);
    setSelected(null);
    setEliminated([]);
    setVerdict(null);
    setError(null);
    setStartedAt(null);
  }

  function restart() {
    try {
      window.sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      /* see above */
    }
    setAnswers([]);
    setIndex(0);
    setSelected(null);
    setEliminated([]);
    setVerdict(null);
    setError(null);
    setStartedAt(null);
    setEliminatorActive(false);
  }

  if (finished) {
    return <DemoSummaryPanel answers={answers} onRestart={restart} />;
  }
  if (!question) return null;

  const hasPassage = !!question.passageHtml?.trim();

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* The page's one gradient (T3.4). Policy reserves `--gradient-primary`
          for the primary CTA, the score gauge *or* the hero signature; this
          panel is the hero signature, so the hero's buttons are flat. */}
      <div className="h-1 bg-gradient-primary" aria-hidden />

      {/* Chrome, matching the real test interface. */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-paper-sunk px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="eyebrow truncate text-muted-foreground">
            {demoModuleLabel(question.sectionType)}
          </p>
          <p className="mt-0.5 text-caption text-muted-foreground">
            Question <span className="tabular">{index + 1}</span> of{" "}
            <span className="tabular">{total}</span>
          </p>
        </div>
        <p
          className="tabular shrink-0 text-h3 text-foreground"
          aria-label={`Time on this demo: ${formatDemoDuration(clockMs)}`}
        >
          {formatDemoDuration(clockMs)}
        </p>
      </div>

      <div className={cn("grid gap-6 p-4 sm:p-6", hasPassage && "lg:grid-cols-2")}>
        {/* Passage stacks above the question below `lg` — at 360px a two-pane
            split is two unreadable columns. */}
        {hasPassage && (
          <div className="min-w-0 lg:border-r lg:border-border lg:pr-6">
            <RichHtml
              html={question.passageHtml}
              className="text-body leading-relaxed text-foreground"
            />
          </div>
        )}

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-foreground text-caption font-semibold text-background">
              <span className="tabular">{index + 1}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                beginTiming();
                setEliminatorActive((active) => !active);
              }}
              aria-pressed={eliminatorActive}
              className={cn(
                "rounded-md border px-2.5 py-1 text-caption font-semibold transition-colors",
                eliminatorActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="line-through" aria-hidden>
                ABC
              </span>
              <span className="sr-only">
                {eliminatorActive ? "Turn off answer eliminator" : "Turn on answer eliminator"}
              </span>
            </button>
          </div>

          <RichHtml
            html={question.stemHtml}
            className="mb-4 text-body leading-relaxed text-foreground"
          />

          <ul className="space-y-3">
            {question.choices.map((choice) => {
              const isSelected = selected === choice.label;
              const isEliminated = eliminated.includes(choice.label);
              const isKey = verdict?.correctAnswer === choice.label;
              const isWrongPick = !!verdict && isSelected && !verdict.correct;

              return (
                <li key={choice.label} className="flex items-stretch gap-2">
                  <button
                    type="button"
                    disabled={!!verdict}
                    aria-pressed={isSelected}
                    onClick={() => {
                      beginTiming();
                      setSelected(choice.label);
                    }}
                    className={cn(
                      "flex flex-1 items-center gap-3 rounded-lg border px-3 py-3 text-left text-body transition sm:px-4",
                      "disabled:cursor-default",
                      verdict && isKey && "border-success bg-success/10",
                      isWrongPick && "border-destructive bg-destructive/10",
                      !verdict && isSelected && "border-primary bg-primary/10 ring-1 ring-primary",
                      !verdict && !isSelected && "border-border hover:bg-muted",
                      verdict && !isKey && !isWrongPick && "border-border",
                      isEliminated && "opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-caption font-semibold",
                        verdict && isKey && "border-success bg-success text-success-foreground",
                        isWrongPick &&
                          "border-destructive bg-destructive text-destructive-foreground",
                        !verdict &&
                          isSelected &&
                          "border-primary bg-primary text-primary-foreground",
                        (!verdict && !isSelected) || (verdict && !isKey && !isWrongPick)
                          ? "border-border text-muted-foreground"
                          : "",
                      )}
                    >
                      {choice.label}
                    </span>
                    <RichHtml
                      html={choice.html}
                      className={cn("min-w-0 flex-1", isEliminated && "line-through")}
                    />
                    {verdict && isKey && (
                      <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
                    )}
                    {isWrongPick && (
                      <X className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                    )}
                  </button>

                  {eliminatorActive && !verdict && (
                    <button
                      type="button"
                      onClick={() => {
                        beginTiming();
                        setEliminated((current) => toggleEliminated(current, choice.label));
                      }}
                      aria-pressed={isEliminated}
                      aria-label={
                        isEliminated
                          ? `Restore choice ${choice.label}`
                          : `Eliminate choice ${choice.label}`
                      }
                      className="flex shrink-0 items-center px-1"
                    >
                      <span
                        className={cn(
                          "relative inline-flex h-7 w-7 items-center justify-center rounded-full border text-caption font-semibold transition-colors",
                          isEliminated
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {choice.label}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute inset-x-[2px] top-1/2 h-px -translate-y-1/2 -rotate-12",
                            isEliminated ? "bg-background" : "bg-muted-foreground",
                          )}
                        />
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {error && (
            <p role="alert" className="mt-4 text-caption text-destructive">
              {error}
            </p>
          )}

          {/* The verdict and explanation announce together — a reader using a
              screen reader should hear the outcome and the reason as one
              message, not two. */}
          <div role="status" aria-live="polite">
            {verdict && (
              <div
                className={cn(
                  "mt-5 rounded-lg border p-4",
                  verdict.correct
                    ? "border-success/30 bg-success/10"
                    : "border-destructive/30 bg-destructive/10",
                )}
              >
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body font-semibold">
                  <span className={verdict.correct ? "text-success" : "text-destructive"}>
                    {verdict.correct
                      ? "Correct"
                      : `Incorrect — the answer is ${verdict.correctAnswer}`}
                  </span>
                  <span className="text-muted-foreground" aria-hidden>
                    ·
                  </span>
                  <span className="tabular text-caption font-normal text-muted-foreground">
                    {formatDemoDuration(
                      answers[answers.length - 1]?.elapsedMs ?? 0,
                    )}{" "}
                    on this question
                  </span>
                </p>
                {verdict.explanationHtml && (
                  <RichHtml
                    html={verdict.explanationHtml}
                    className="mt-3 text-body leading-relaxed text-foreground"
                  />
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {verdict ? (
              <Button type="button" onClick={advance}>
                {index + 1 === total ? "See how you did" : "Next question"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={submit}
                disabled={!selected}
                loading={submitting}
              >
                Check answer
              </Button>
            )}
            {!verdict && !selected && (
              <p className="text-caption text-muted-foreground">Pick an answer to check it.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The end of the demo.
 *
 * `2 of 3 · 1m 12s` and nothing else. Three questions cannot support a score
 * projection, and inventing one here would be the same failure as the old
 * hardcoded stats strip: a number the product cannot back.
 */
function DemoSummaryPanel({
  answers,
  onRestart,
}: {
  answers: DemoAnswerRecord[];
  onRestart: () => void;
}) {
  const summary = buildDemoSummary(answers);

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-border bg-card text-center shadow-sm">
      {/* Same rail as the question panel — the summary replaces it in place,
          and the signature should not blink out on the last click. */}
      <div className="h-1 bg-gradient-primary" aria-hidden />

      <div className="p-6 sm:p-8">
        <p className="eyebrow text-muted-foreground">Demo complete</p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-h2">
          <span className="tabular">{summary.scoreText}</span>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span className="tabular text-muted-foreground">{summary.durationText}</span>
        </p>
        {/* T3.4: "timed and adaptive" was here. Every public test is `LINEAR`,
            so the word described the code rather than what this visitor gets. */}
        <p className="mx-auto mt-4 max-w-[52ch] text-body-lg text-muted-foreground">
          Three questions is too few to estimate a score. A full practice test is two timed
          modules per section, and it ends with a real score report.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/practice">
              Take a full sample test
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/signup">Create free account</Link>
          </Button>
        </div>
        <p className="mt-3 text-caption text-muted-foreground">
          The sample test needs no signup.
        </p>

        <button
          type="button"
          onClick={onRestart}
          className="mt-6 rounded-sm text-caption text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Try the demo again
        </button>
      </div>
    </div>
  );
}
