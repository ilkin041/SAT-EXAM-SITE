"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  XCircle,
  CircleSlash,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichContent } from "@/components/rich-content";
import { ResizableSplit } from "@/components/resizable-split";
import { formatDuration } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Choice = { label: "A" | "B" | "C" | "D"; text: string };

export interface ReviewItem {
  questionId: string;
  sectionType: "READING_WRITING" | "MATH";
  moduleNumber: number;
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  domain: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  passage: string | null;
  stem: string;
  imageUrl: string | null;
  imagePosition: "TOP" | "INLINE";
  imageMaxWidth: number | null;
  choices: Choice[] | null;
  correctAnswer: string | null;
  acceptedAnswers: string[] | null;
  explanation: string | null;
  studentResponse: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

interface Props {
  attemptId: string;
  testTitle: string;
  items: ReviewItem[];
}

/**
 * Bluebook-style one-question-at-a-time answer review.
 *
 * Layout adapts to section type: R&W gets a resizable two-pane (passage |
 * question), Math gets a single column. Keyboard nav with ←/→ jumps between
 * questions; the URL hash keeps the position so refresh / share preserves it.
 */
export function ReviewClient({ attemptId, testTitle, items }: Props) {
  const [index, setIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const fromHash = parseInt(window.location.hash.replace("#q", ""), 10);
    if (Number.isFinite(fromHash) && fromHash > 0 && fromHash <= items.length) {
      return fromHash - 1;
    }
    return 0;
  });

  const total = items.length;
  const item = items[index];

  // Keep URL hash in sync so refresh / share land on the same question.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const newHash = `#q${index + 1}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  }, [index]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setIndex((i) => Math.min(total - 1, i + 1));
  }, [total]);

  // Keyboard shortcuts. Don't hijack arrows while the student is in an
  // input or has selected text — they might be navigating within text.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  if (!item) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Link
          href={`/results/${attemptId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Review answers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No questions to review for this attempt.
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      {/* ----- Top bar ----- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/results/${attemptId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </Link>
        <div className="text-xs text-muted-foreground">{testTitle}</div>
      </div>

      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Review answers</h1>
        <div className="text-sm text-muted-foreground">
          Question{" "}
          <span className="font-semibold text-foreground tabular-nums">{index + 1}</span>{" "}
          of <span className="tabular-nums">{total}</span>
        </div>
      </header>

      {/* ----- Meta row ----- */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={item.sectionType === "MATH" ? "info" : "success"}>
          {item.sectionType === "MATH" ? "Math" : "R&W"} · Module {item.moduleNumber}
        </Badge>
        <Badge variant="muted">{item.domain}</Badge>
        <Badge variant={difficultyVariant(item.difficulty)}>
          {item.difficulty}
        </Badge>
        <span className="ml-auto">
          <StatusBadge
            answered={!!item.studentResponse}
            isCorrect={item.isCorrect}
          />
        </span>
      </div>

      {/* ----- Question body ----- */}
      {item.sectionType === "READING_WRITING" && item.passage ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <ResizableSplit
            left={
              <div className="h-full overflow-y-auto px-5 py-5">
                <RichContent
                  html={item.passage}
                  className="rich-content text-base leading-relaxed"
                />
              </div>
            }
            right={
              <div className="h-full overflow-y-auto px-5 py-5">
                <QuestionBody item={item} />
              </div>
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <QuestionBody item={item} />
        </div>
      )}

      {/* ----- Time spent ----- */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        You spent{" "}
        <span className="font-medium text-foreground tabular-nums">
          {formatDuration(item.timeSpentSeconds)}
        </span>{" "}
        on this question.
      </p>

      {/* ----- Navigation ----- */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={goPrev}
          disabled={index === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Use <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">←</kbd>{" "}
          /{" "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">→</kbd>{" "}
          to navigate
        </span>
        <Button
          type="button"
          onClick={goNext}
          disabled={index === total - 1}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ----- Per-question jumper ----- */}
      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {items.map((it, i) => (
          <button
            key={it.questionId}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "h-7 w-7 rounded-md border text-xs font-medium tabular-nums transition-colors",
              i === index
                ? "border-primary bg-primary text-primary-foreground"
                : !it.studentResponse
                  ? "border-border bg-card text-muted-foreground hover:bg-accent"
                  : it.isCorrect
                    ? "border-green-500/40 bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300"
                    : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
            )}
            aria-label={`Go to question ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </main>
  );
}

function QuestionBody({ item }: { item: ReviewItem }) {
  return (
    <>
      {item.imageUrl && item.imagePosition === "TOP" && (
        <img
          src={item.imageUrl}
          alt=""
          className="mb-4 rounded-md border border-border"
          style={item.imageMaxWidth ? { maxWidth: `${item.imageMaxWidth}px` } : undefined}
        />
      )}
      <RichContent
        html={item.stem}
        className="rich-content mb-5 text-base leading-relaxed"
      />
      {item.imageUrl && item.imagePosition === "INLINE" && (
        <img
          src={item.imageUrl}
          alt=""
          className="my-4 rounded-md border border-border"
          style={item.imageMaxWidth ? { maxWidth: `${item.imageMaxWidth}px` } : undefined}
        />
      )}

      {item.type === "MULTIPLE_CHOICE" && item.choices ? (
        <ChoicesList
          choices={item.choices}
          studentResponse={item.studentResponse}
          correctAnswer={item.correctAnswer}
        />
      ) : (
        <SprAnswerBoxes
          studentResponse={item.studentResponse}
          correctAnswer={item.correctAnswer}
          accepted={item.acceptedAnswers}
        />
      )}

      {item.explanation && (
        <div className="mt-5 flex gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <Lightbulb
            className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-300">
              Explanation
            </div>
            <RichContent
              html={item.explanation}
              className="rich-content text-sm leading-relaxed text-blue-950 dark:text-blue-100"
            />
          </div>
        </div>
      )}

      <AiExplanationBox item={item} />
    </>
  );
}

function ChoicesList({
  choices,
  studentResponse,
  correctAnswer,
}: {
  choices: Choice[];
  studentResponse: string;
  correctAnswer: string | null;
}) {
  return (
    <ul className="space-y-2">
      {choices.map((c) => {
        const isStudent = studentResponse === c.label;
        const isCorrectChoice = correctAnswer === c.label;
        // Style priority: student-correct (green fill), student-wrong (red fill),
        // unchosen-but-correct (green outline only).
        let cls = "border-border bg-card";
        let label: { text: string; tone: "good" | "bad" | "info" } | null = null;
        if (isStudent && isCorrectChoice) {
          cls =
            "border-green-500/50 bg-green-50 dark:bg-green-950/30";
          label = { text: "Your answer", tone: "good" };
        } else if (isStudent && !isCorrectChoice) {
          cls = "border-destructive/50 bg-destructive/10";
          label = { text: "Your answer", tone: "bad" };
        } else if (!isStudent && isCorrectChoice) {
          cls = "border-green-500/60 bg-card";
          label = { text: "Correct answer", tone: "info" };
        }
        return (
          <li
            key={c.label}
            className={cn(
              "flex items-start gap-3 rounded-lg border-2 px-4 py-3 transition-colors",
              cls,
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                isCorrectChoice
                  ? "border-green-600 bg-green-600 text-white"
                  : isStudent
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-border bg-card text-foreground",
              )}
            >
              {c.label}
            </span>
            <div className="min-w-0 flex-1">
              <RichContent html={c.text} className="rich-content text-sm leading-relaxed" />
              {label && (
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    label.tone === "good" &&
                      "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
                    label.tone === "bad" && "bg-destructive/15 text-destructive",
                    label.tone === "info" &&
                      "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
                  )}
                >
                  {label.tone === "good" && <CheckCircle2 className="h-3 w-3" />}
                  {label.tone === "bad" && <XCircle className="h-3 w-3" />}
                  {label.tone === "info" && <CheckCircle2 className="h-3 w-3" />}
                  {label.text}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SprAnswerBoxes({
  studentResponse,
  correctAnswer,
  accepted,
}: {
  studentResponse: string;
  correctAnswer: string | null;
  accepted: string[] | null;
}) {
  const studentAnswered = studentResponse.trim().length > 0;
  // Reasonable single-line "correct" display: first accepted form, falling
  // back to correctAnswer field.
  const correctDisplay =
    (accepted && accepted.length > 0 ? accepted.join(" or ") : correctAnswer) ??
    "—";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div
        className={cn(
          "rounded-lg border-2 p-4",
          !studentAnswered
            ? "border-border bg-muted/30"
            : "border-border bg-card",
        )}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your answer
        </div>
        <div className="mt-2 font-mono text-lg">
          {studentAnswered ? (
            studentResponse
          ) : (
            <span className="italic text-muted-foreground">(not answered)</span>
          )}
        </div>
      </div>
      <div className="rounded-lg border-2 border-green-500/40 bg-green-50/60 p-4 dark:bg-green-950/20">
        <div className="text-xs font-semibold uppercase tracking-wide text-green-800 dark:text-green-300">
          Correct answer
        </div>
        <div className="mt-2 font-mono text-lg text-green-900 dark:text-green-200">
          {correctDisplay}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  answered,
  isCorrect,
}: {
  answered: boolean;
  isCorrect: boolean;
}) {
  if (!answered) {
    return (
      <Badge variant="muted" className="gap-1">
        <CircleSlash className="h-3 w-3" />
        Skipped
      </Badge>
    );
  }
  if (isCorrect) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Correct
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      Incorrect
    </Badge>
  );
}

function difficultyVariant(
  d: "EASY" | "MEDIUM" | "HARD" | "MIXED",
): "success" | "warning" | "destructive" | "muted" {
  if (d === "EASY") return "success";
  if (d === "MEDIUM") return "warning";
  if (d === "HARD") return "destructive";
  return "muted";
}

function AiExplanationBox({ item }: { item: ReviewItem }) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAiExplanation(null);
    setError(null);
    setLoading(false);
  }, [item.questionId]);

  // Only show the AI tutor option if the student answered incorrectly
  if (!item.studentResponse || item.isCorrect) return null;

  const askAi = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionStem: item.stem,
          choices: item.choices,
          studentResponse: item.studentResponse,
          correctAnswer: item.correctAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get AI explanation.");
      setAiExplanation(data.explanation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!aiExplanation && !loading && !error) {
    return (
      <div className="mt-5 text-center">
        <Button
          onClick={askAi}
          variant="secondary"
          className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 hover:from-indigo-500/20 hover:to-purple-500/20 dark:from-indigo-500/20 dark:to-purple-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Ask AI Tutor Why You Missed This
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <div className="mb-3 flex items-center gap-2 font-semibold text-indigo-800 dark:text-indigo-300">
        <Sparkles className="h-5 w-5" />
        AI Tutor Explanation
      </div>
      
      {loading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          Analyzing your answer...
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">
          <span className="font-semibold">Error:</span> {error}
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={askAi}>Try again</Button>
          </div>
        </div>
      )}

      {aiExplanation && (
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100">
          <RichContent html={aiExplanation} />
        </div>
      )}
    </div>
  );
}
