"use client";

import { useEffect, useState } from "react";
import {
  Calculator as CalculatorIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Flag,
  MapPin,
  Battery,
} from "lucide-react";
import { RichContent } from "@/components/rich-content";
import { ResizableSplit } from "@/components/resizable-split";
import { AnnotatedPassage } from "@/components/annotated-passage";
import { cn } from "@/lib/utils";
import type { ClientQuestion } from "@/lib/attempt-engine";
import { SaveIndicator, type SaveStatus } from "./save-indicator";
import { MoreMenu } from "./more-menu";
import { SprInput } from "./spr-input";

type Eliminated = ("A" | "B" | "C" | "D")[];

type AnswerMap = Record<
  string,
  {
    response: string;
    isMarkedForReview: boolean;
    eliminatedChoices: Eliminated;
    timeSpent: number;
  }
>;

const BREAK_SECONDS = 10 * 60;

export function Loader({ text }: { text: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-white text-sm text-neutral-600">
      {text}
    </div>
  );
}
export function TopBar({
  title,
  remainingSeconds,
  timerHidden,
  onToggleTimer,
  onShowDirections,
  onShowShortcuts,
  isMath,
  onOpenCalculator,
  onOpenReference,
  calcOpen,
  refOpen,
}: {
  title: string;
  remainingSeconds: number;
  timerHidden: boolean;
  onToggleTimer: () => void;
  onShowDirections: () => void;
  onShowShortcuts: () => void;
  isMath: boolean;
  onOpenCalculator: () => void;
  onOpenReference: () => void;
  calcOpen: boolean;
  refOpen: boolean;
}) {
  const low = remainingSeconds <= 5 * 60;
  // "Critical" is the last minute â€” full-bar background pulse + larger
  // seconds-only timer display per spec.
  const critical = remainingSeconds <= 60 && remainingSeconds > 0;
  const mm = Math.floor(remainingSeconds / 60);
  const ss = String(remainingSeconds % 60).padStart(2, "0");
  const criticalSeconds = String(remainingSeconds).padStart(2, "0");

  return (
    <header
      className={cn(
        "grid h-16 shrink-0 grid-cols-3 items-center border-b border-neutral-300 bg-[#f4f5f7] px-6",
        critical && !timerHidden && "animate-timer-critical",
      )}
    >
      {/* Left: section label + Directions dropdown */}
      <div className="flex flex-col">
        <div
          className={cn(
            "text-sm font-semibold",
            critical && !timerHidden ? "text-white" : "text-neutral-900",
          )}
        >
          {title}
        </div>
        <button
          type="button"
          onClick={onShowDirections}
          className={cn(
            "-ml-0.5 mt-0.5 inline-flex w-fit items-center gap-0.5 rounded-sm px-0.5 text-xs",
            critical && !timerHidden
              ? "text-white/90 hover:bg-white/10"
              : "text-neutral-700 hover:bg-neutral-200",
          )}
        >
          Directions <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Center: timer + Hide pill */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "font-mono font-bold tabular-nums leading-none",
            critical && !timerHidden
              ? "text-4xl text-white"
              : "text-2xl",
            !critical && timerHidden && "text-neutral-500",
            !critical && !timerHidden && low && "text-red-600",
            !critical && !timerHidden && !low && "text-neutral-900",
          )}
        >
          {timerHidden ? "Hidden" : critical ? `:${criticalSeconds}` : `${mm}:${ss}`}
        </div>
        <button
          type="button"
          onClick={onToggleTimer}
          className="mt-1 rounded-full border border-neutral-400 bg-white px-3 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-700 hover:bg-neutral-100"
        >
          {timerHidden ? "Show" : "Hide"}
        </button>
      </div>

      {/* Right: icon buttons + battery */}
      <div className="flex items-center justify-end gap-1">
        {isMath && (
          <>
            <IconLabel
              icon={<CalculatorIcon className="h-5 w-5" />}
              label="Calculator"
              active={calcOpen}
              onClick={onOpenCalculator}
              title="Graphing calculator"
            />
            <IconLabel
              icon={<BookOpen className="h-5 w-5" />}
              label="Reference"
              active={refOpen}
              onClick={onOpenReference}
              title="Reference sheet"
            />
          </>
        )}
        <MoreMenu
          onShowDirections={onShowDirections}
          onShowShortcuts={onShowShortcuts}
        />
        <div className="ml-3 flex items-center gap-1 text-xs text-neutral-600">
          <Battery className="h-4 w-5 rotate-90" />
          <span className="tabular-nums">100%</span>
        </div>
      </div>
    </header>
  );
}

export function IconLabel({
  icon,
  label,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex flex-col items-center rounded-md px-2 py-1 text-[10px] leading-tight transition-colors",
        active
          ? "bg-blue-100 text-blue-700"
          : "text-neutral-700 hover:bg-neutral-200",
      )}
    >
      {icon}
      <span className="mt-0.5">{label}</span>
    </button>
  );
}

export function QuestionImage({
  src,
  maxWidthPx,
  className,
}: {
  src: string;
  maxWidthPx: number | null;
  className?: string;
}) {
  return (
    <figure className={cn("flex justify-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={maxWidthPx ? { maxWidth: `${maxWidthPx}px` } : undefined}
        className="block max-w-full rounded-md border border-neutral-200"
      />
    </figure>
  );
}

export function PracticeBanner() {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center bg-[#1a237e] text-xs font-bold tracking-wider text-white">
      THIS IS A PRACTICE TEST
    </div>
  );
}

export function BottomBar({
  studentName,
  saveStatus,
  questionNumber,
  totalQuestions,
  isReview,
  isLast,
  onBack,
  onNext,
  onOpenNavigator,
  onGoToReview,
}: {
  studentName: string;
  saveStatus: SaveStatus;
  questionNumber: number;
  totalQuestions: number;
  isReview: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onOpenNavigator: () => void;
  onGoToReview: () => void;
}) {
  return (
    <footer className="grid h-16 shrink-0 grid-cols-3 items-center border-t border-neutral-300 bg-white px-6">
      <div className="flex items-center truncate text-sm font-medium text-neutral-800">
        <span className="truncate">{studentName}</span>
        <SaveIndicator status={saveStatus} />
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onOpenNavigator}
          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          {isReview
            ? `Review: ${totalQuestions} questions`
            : `Question ${questionNumber} of ${totalQuestions}`}
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-neutral-400 px-5 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
        >
          Back
        </button>
        {!isReview ? (
          <button
            type="button"
            onClick={onNext}
            className="rounded-full bg-blue-700 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            {isLast ? "Go to Review" : "Next"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onGoToReview}
            className="rounded-full bg-blue-700 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Review
          </button>
        )}
      </div>
    </footer>
  );
}

type AnswerPatch = {
  response?: string;
  isMarkedForReview?: boolean;
  eliminatedChoices?: Eliminated;
};

export function QuestionView({
  question,
  questionNumber,
  attemptId,
  answer,
  eliminatorActive,
  onToggleEliminator,
  onChange,
}: {
  question: ClientQuestion;
  questionNumber: number;
  attemptId: string;
  answer: AnswerMap[string];
  eliminatorActive: boolean;
  onToggleEliminator: () => void;
  onChange: (patch: AnswerPatch) => void;
}) {
  const hasPassage = !!question.passage?.trim();
  const onChangeWrapper = (patch: AnswerPatch) => onChange(patch);

  const toggleElim = (label: "A" | "B" | "C" | "D") => {
    const list = answer.eliminatedChoices ?? [];
    const next = list.includes(label) ? list.filter((l) => l !== label) : [...list, label];
    onChangeWrapper({ eliminatedChoices: next });
  };

  const flagged = !!answer.isMarkedForReview;

  const questionPane = (
    <div className={cn(hasPassage ? "p-8" : "mx-auto max-w-2xl p-8")}>
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-neutral-300 pb-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center bg-neutral-900 text-sm font-semibold text-white">
            {questionNumber}
          </span>
          <button
            type="button"
            onClick={() =>
              onChangeWrapper({ isMarkedForReview: !flagged })
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-1 text-sm transition-colors",
              flagged ? "text-red-600" : "text-neutral-700 hover:text-neutral-900",
            )}
            title="Mark this question for review"
          >
            <Flag
              className={cn("h-4 w-4", flagged && "fill-red-600 text-red-600")}
            />
            Mark for Review
          </button>
        </div>
        {question.type === "MULTIPLE_CHOICE" && (
          <button
            type="button"
            onClick={onToggleEliminator}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors",
              eliminatorActive
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-neutral-400 text-neutral-700 hover:bg-neutral-100",
            )}
            title="Toggle answer eliminator"
          >
            <span className="line-through">ABC</span>
          </button>
        )}
      </div>

        {question.imageUrl && question.imagePosition === "TOP" && (
          <QuestionImage
            src={question.imageUrl}
            maxWidthPx={question.imageMaxWidth}
            className="mb-5"
          />
        )}

        <RichContent html={question.stem} className="mb-4 text-base leading-relaxed" />

        {question.imageUrl && question.imagePosition === "INLINE" && (
          <QuestionImage
            src={question.imageUrl}
            maxWidthPx={question.imageMaxWidth}
            className="mb-5"
          />
        )}

        {question.type === "MULTIPLE_CHOICE" && question.choices && (
          <ul className="space-y-3">
            {question.choices.map((c) => {
              const selected = answer.response === c.label;
              const eliminated = answer.eliminatedChoices?.includes(c.label);
              return (
                <li key={c.label} className="flex items-stretch gap-3">
                  {/* Left side: the actual selector */}
                  <button
                    type="button"
                    onClick={() => onChangeWrapper({ response: c.label })}
                    className={cn(
                      "flex flex-1 items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
                      selected
                        ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700"
                        : "border-neutral-400 hover:bg-neutral-50",
                      eliminated && "opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                        selected
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-neutral-500 bg-white text-neutral-700",
                      )}
                    >
                      {c.label}
                    </span>
                    <RichContent
                      html={c.text}
                      className={cn("flex-1", eliminated && "line-through")}
                    />
                  </button>

                  {/* Right side: eliminator circle. Only shown when ABC mode is active. */}
                  {eliminatorActive && (
                    <button
                      type="button"
                      onClick={() => toggleElim(c.label)}
                      title={eliminated ? "Restore choice" : "Eliminate choice"}
                      aria-label={
                        eliminated
                          ? `Restore choice ${c.label}`
                          : `Eliminate choice ${c.label}`
                      }
                      className="flex shrink-0 items-center"
                    >
                      <span
                        className={cn(
                          "relative inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                          eliminated
                            ? "border-neutral-700 bg-neutral-700 text-white"
                            : "border-neutral-500 bg-white text-neutral-700 hover:bg-neutral-100",
                        )}
                      >
                        {c.label}
                        {/* Strikethrough line drawn through the circle */}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-[2px] right-[2px] top-1/2 h-px -translate-y-1/2 rotate-[-12deg]",
                            eliminated ? "bg-white" : "bg-neutral-700",
                          )}
                        />
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {question.type === "STUDENT_PRODUCED_RESPONSE" && (
          <div>
            <label className="block text-sm font-medium">Your answer</label>
            <SprInput
              value={answer.response}
              onChange={(next) => onChangeWrapper({ response: next })}
              placeholder="e.g. 4  or  1/2  or  0.5"
            />
            <p className="mt-2 text-xs text-neutral-500">
              Answer preview:{" "}
              <span className="font-mono text-neutral-800">
                {answer.response ? `"${answer.response}"` : "â€”"}
              </span>
            </p>
          </div>
        )}
      </div>
  );

  if (hasPassage) {
    return (
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <ResizableSplit
          storageKey="rw-passage-split"
          left={
            <div className="p-8">
              <AnnotatedPassage
                passageHtml={question.passage}
                attemptId={attemptId}
                questionId={question.id}
              />
            </div>
          }
          right={questionPane}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 overflow-y-auto">
      {questionPane}
    </main>
  );
}

export function ReviewPage({
  questions,
  answers,
  currentIndex,
  onJumpTo,
  onConfirmSubmit,
}: {
  questions: ClientQuestion[];
  answers: AnswerMap;
  currentIndex: number;
  onJumpTo: (i: number) => void;
  onConfirmSubmit: () => void;
}) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-2xl font-semibold">Check your work</h2>
        <p className="mt-1 text-sm text-neutral-600">
          On test day, you won't be able to come back to this module once you submit it.
        </p>
        <div className="my-6 flex items-center justify-center gap-6 border-y border-neutral-200 py-3 text-xs text-neutral-700">
          <LegendItem
            icon={<MapPin className="h-4 w-4 text-neutral-900" />}
            label="Current"
          />
          <LegendItem
            icon={
              <span className="inline-block h-4 w-4 rounded-sm border-2 border-dashed border-blue-700" />
            }
            label="Unanswered"
          />
          <LegendItem
            icon={<Flag className="h-4 w-4 fill-red-600 text-red-600" />}
            label="For Review"
          />
        </div>
        <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 md:grid-cols-10">
          {questions.map((q, i) => {
            const a = answers[q.id];
            const answered = !!a?.response;
            const flagged = !!a?.isMarkedForReview;
            const current = i === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onJumpTo(i)}
                className={cn(
                  "relative aspect-square rounded-md text-sm font-semibold transition",
                  answered
                    ? "border-2 border-blue-700 bg-blue-700 text-white"
                    : "border-2 border-dashed border-blue-700 bg-white text-blue-700 hover:bg-blue-50",
                )}
              >
                {current && (
                  <MapPin
                    className={cn(
                      "absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2",
                      answered ? "fill-white text-white" : "fill-blue-700 text-blue-700",
                    )}
                  />
                )}
                {i + 1}
                {flagged && (
                  <Flag className="absolute -right-1 -top-1 h-4 w-4 fill-red-600 text-red-600" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onConfirmSubmit}
            className="rounded-full bg-blue-700 px-8 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Submit module
          </button>
        </div>
      </div>
    </main>
  );
}

export function NavigatorModal({
  questions,
  answers,
  currentIndex,
  title,
  onClose,
  onJump,
  onGoToReview,
}: {
  questions: ClientQuestion[];
  answers: AnswerMap;
  currentIndex: number;
  title: string;
  onClose: () => void;
  onJump: (i: number) => void;
  onGoToReview: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex animate-in fade-in items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-t-xl border border-neutral-300 bg-white shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigator"
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100"
          >
            âœ•
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 border-b border-neutral-200 py-3 text-xs text-neutral-700">
          <LegendItem
            icon={<MapPin className="h-4 w-4 text-neutral-900" />}
            label="Current"
          />
          <LegendItem
            icon={
              <span className="inline-block h-4 w-4 rounded-sm border-2 border-dashed border-blue-700" />
            }
            label="Unanswered"
          />
          <LegendItem
            icon={<Flag className="h-4 w-4 fill-red-600 text-red-600" />}
            label="For Review"
          />
        </div>

        <div className="p-6">
          <div className="grid grid-cols-10 gap-2.5">
            {questions.map((q, i) => {
              const a = answers[q.id];
              const answered = !!a?.response;
              const flagged = !!a?.isMarkedForReview;
              const current = i === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onJump(i)}
                  className={cn(
                    "relative aspect-square rounded-md text-sm font-semibold",
                    answered
                      ? "border-2 border-blue-700 bg-blue-700 text-white"
                      : "border-2 border-dashed border-blue-700 bg-white text-blue-700",
                  )}
                >
                  {current && (
                    <MapPin
                      className={cn(
                        "absolute -top-2.5 left-1/2 h-4 w-4 -translate-x-1/2",
                        answered ? "fill-white text-white" : "fill-blue-700 text-blue-700",
                      )}
                    />
                  )}
                  {i + 1}
                  {flagged && (
                    <Flag className="absolute -right-1 -top-1 h-4 w-4 fill-red-600 text-red-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-neutral-200 px-6 py-4 text-center">
          <button
            type="button"
            onClick={onGoToReview}
            className="rounded-full border border-blue-700 px-6 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Go to Review Page
          </button>
        </div>
      </div>
    </div>
  );
}

export function LegendItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {label}
    </span>
  );
}

export function DirectionsModal({
  sectionType,
  onClose,
}: {
  sectionType: "READING_WRITING" | "MATH";
  onClose: () => void;
}) {
  const text =
    sectionType === "READING_WRITING"
      ? "The questions in this section address a number of important reading and writing skills. Each question includes one or more passages. Read each passage and question carefully, and then choose the best answer."
      : "The questions in this section address a number of important math skills. Use of a calculator is permitted for all questions. Reference figures are provided. Unless otherwise indicated, all variables and expressions represent real numbers.";

  return (
    <div
      className="fixed inset-0 z-40 flex animate-in fade-in items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-neutral-300 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-lg font-semibold">Directions</h3>
        <p className="text-sm leading-relaxed text-neutral-700">{text}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex animate-in fade-in items-center justify-center bg-black/30"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-300 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-neutral-700">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BreakScreen({
  startedAt,
  serverOffsetMs,
  onResume,
  studentName,
}: {
  startedAt: string | null;
  serverOffsetMs: number;
  nextSectionLabel: string;
  onResume: () => void;
  studentName: string;
}) {
  const [now, setNow] = useState(() => Date.now() + serverOffsetMs);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + serverOffsetMs), 1000);
    return () => clearInterval(id);
  }, [serverOffsetMs]);
  const startedMs = startedAt ? new Date(startedAt).getTime() : now;
  const elapsed = Math.floor((now - startedMs) / 1000);
  const remaining = Math.max(0, BREAK_SECONDS - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="flex h-screen flex-col bg-[#121212] text-white">
      <div className="flex flex-1 items-center">
        <div className="grid h-full w-full grid-cols-1 items-center md:grid-cols-[2fr_3fr]">
          {/* Left: timer + Resume button */}
          <div className="flex flex-col items-center justify-center px-8 py-12">
            <div className="w-full max-w-sm rounded-xl border border-neutral-700 bg-[#1a1a1a] p-8 text-center">
              <div className="text-base font-semibold text-white">
                Remaining Break Time:
              </div>
              <div className="mt-4 font-mono text-7xl font-bold tabular-nums text-white">
                {mm}:{ss}
              </div>
            </div>
            <button
              type="button"
              onClick={onResume}
              className="mt-8 rounded-full bg-yellow-400 px-8 py-3 text-base font-semibold text-neutral-900 shadow-md hover:bg-yellow-300"
            >
              Resume Testing
            </button>
          </div>

          {/* Right: copy */}
          <div className="space-y-6 px-8 py-12 md:max-w-2xl md:pr-16">
            <h1 className="text-3xl font-bold">Practice Test Break</h1>
            <p className="text-base leading-relaxed text-neutral-200">
              You can resume this practice test as soon as you're ready to move on.
              On test day, you'll wait until the clock counts down. Read below to see
              how breaks work on test day.
            </p>
            <hr className="border-neutral-700" />
            <h2 className="text-2xl font-bold">
              Take a Break: Do Not Close Your Device
            </h2>
            <p className="text-base text-neutral-200">
              After the break, a{" "}
              <span className="font-semibold">Resume Testing Now</span> button will appear
              and you'll start the next section.
            </p>
            <div>
              <p className="text-base font-semibold">Follow these rules during the break:</p>
              <ol className="mt-3 space-y-2 pl-6 text-base text-neutral-200 [counter-reset:rule] [&>li]:relative [&>li]:pl-2 [&>li]:[counter-increment:rule] [&>li:before]:absolute [&>li:before]:-left-6 [&>li:before]:content-[counter(rule)'.']">
                <li>Do not disturb students who are still testing.</li>
                <li>Do not exit the app or close your laptop.</li>
                <li>Do not access phones, smartwatches, textbooks, notes, or the internet.</li>
                <li>Do not eat or drink near any testing device.</li>
                <li>
                  Do not speak in the testing room; outside the room, do not discuss the
                  exam with anyone.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-6 text-sm font-semibold text-white">{studentName}</div>
    </div>
  );
}
