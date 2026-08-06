"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DesmosCalculator } from "@/components/desmos-calculator";
import { ReferenceSheet } from "@/components/reference-sheet";
import type { AttemptState, ClientAnswer, ClientQuestion } from "@/lib/attempt-engine";
import {
  ConnectivityBanner,
  DuplicateTabOverlay,
  ResumingSplash,
  useNetworkStatus,
  useTabConflictGuard,
} from "./connectivity-overlays";
import type { SaveStatus } from "./save-indicator";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { playTimeUpBeep } from "@/lib/audio-beep";
import { useToast } from "@/components/toast";
import {
  BottomBar,
  BreakScreen,
  ConfirmDialog,
  DirectionsModal,
  Loader,
  NavigatorModal,
  PracticeBanner,
  QuestionView,
  ReviewPage,
  TopBar,
} from "./test-interface-components";

interface Props {
  initialState: AttemptState;
  studentName: string;
}

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

type AnswerPatch = {
  response?: string;
  isMarkedForReview?: boolean;
  eliminatedChoices?: Eliminated;
};

type Phase = "in_module" | "review" | "break" | "loading_next" | "submitting";

export function TestInterface({ initialState, studentName }: Props) {
  const router = useRouter();

  // ---------- State (per module reset on transition) ----------
  const [state, setState] = useState<AttemptState>(initialState);
  const [phase, setPhase] = useState<Phase>(
    initialState.isOnBreak ? "break" : "in_module",
  );
  const [currentIndex, setCurrentIndex] = useState(
    initialState.attempt.currentQuestionIndex || 0,
  );
  const [answers, setAnswers] = useState<AnswerMap>(() => buildAnswerMap(initialState.answers));
  const [eliminatorActive, setEliminatorActive] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ---------- Connectivity & multi-tab guards ----------
  const { isOffline, justReconnected } = useNetworkStatus();
  const isDuplicateTab = useTabConflictGuard(initialState.attempt.id);

  // ---------- Save-indicator status & timer warnings ----------
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  // One-shot guards so the same warning doesn't fire on every tick.
  const oneMinWarnedRef = useRef(false);
  const beepedRef = useRef(false);
  const [timeUp, setTimeUp] = useState(false);

  // ---------- Resume splash ----------
  // Show for ~1s when the student lands on the attempt page mid-progress
  // (they had a saved index or saved answers). Brand-new starts of a module
  // skip the splash.
  const isResuming =
    (initialState.attempt.currentQuestionIndex || 0) > 0 ||
    initialState.answers.length > 0;
  const [showResumeSplash, setShowResumeSplash] = useState(isResuming);
  useEffect(() => {
    if (!showResumeSplash) return;
    const id = setTimeout(() => setShowResumeSplash(false), 1000);
    return () => clearTimeout(id);
  }, [showResumeSplash]);

  // Clock skew so the timer is anchored to server time.
  const clockOffsetRef = useRef<number>(state.serverNow - Date.now());

  // ---------- Timer ----------
  const [now, setNow] = useState(() => Date.now() + clockOffsetRef.current);
  useEffect(() => {
    if (phase !== "in_module" && phase !== "review") return;
    const id = setInterval(() => setNow(Date.now() + clockOffsetRef.current), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const remainingSeconds = useMemo(() => {
    if (!state.moduleStartedAt) return state.timeLimitSeconds;
    const startedMs = new Date(state.moduleStartedAt).getTime();
    const elapsed = Math.floor((now - startedMs) / 1000);
    return Math.max(0, state.timeLimitSeconds - elapsed);
  }, [now, state.moduleStartedAt, state.timeLimitSeconds]);

  // ---------- Auto-submit when timer hits zero + timer warnings ----------
  const submittingRef = useRef(false);
  useEffect(() => {
    if (phase !== "in_module" && phase !== "review") return;

    // One-time toast the first time we drop under 1 minute.
    if (
      remainingSeconds <= 60 &&
      remainingSeconds > 0 &&
      !oneMinWarnedRef.current
    ) {
      oneMinWarnedRef.current = true;
      toast("â° Less than 1 minute remaining!", "error");
    }

    if (remainingSeconds <= 0 && !submittingRef.current) {
      submittingRef.current = true;
      if (!beepedRef.current) {
        beepedRef.current = true;
        playTimeUpBeep();
      }
      // Show the "Time's up!" overlay before the submission transitions
      // away â€” gives the student 2 s to register what happened.
      setTimeUp(true);
      setTimeout(() => {
        void submitModule(true);
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, phase]);

  // ---------- Persist answers (debounced, on idle) ----------
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const schedulePersist = useCallback(
    (
      questionId: string,
      value: AnswerMap[string],
      qIndex: number,
    ) => {
      if (saveTimeoutRef.current[questionId]) {
        clearTimeout(saveTimeoutRef.current[questionId]);
      }
      saveTimeoutRef.current[questionId] = setTimeout(async () => {
        // Surface a "Saving" pill briefly. With a 400 ms debounce the fetch
        // usually finishes fast enough that the user only sees "Saved", but
        // this keeps the indicator honest on slower connections.
        setSaveStatus("saving");
        if (saveClearRef.current) {
          clearTimeout(saveClearRef.current);
          saveClearRef.current = null;
        }
        try {
          const res = await fetch(`/api/attempts/${state.attempt.id}/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId,
              response: value.response,
              isMarkedForReview: value.isMarkedForReview,
              eliminatedChoices: value.eliminatedChoices,
              timeSpent: value.timeSpent,
              currentQuestionIndex: qIndex,
            }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              code?: string;
              error?: string;
            };
            if (data.code === "TIME_EXPIRED" || data.code === "ATTEMPT_EXPIRED") {
              setTimeUp(true);
              toast("Time expired. No further answers can be saved.", "error");
            }
            throw new Error(data.error ?? `status ${res.status}`);
          }
          setSaveStatus("saved");
          // Wipe the "Saved" indicator back to idle after 1.5s so it stays
          // a subtle confirmation, not a persistent badge.
          saveClearRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
        } catch {
          // Stay in error state until a subsequent save succeeds.
          setSaveStatus("error");
        }
      }, 400);
    },
    [state.attempt.id],
  );

  // Per-question time tracking (rough: increment timeSpent on the current question every second).
  useEffect(() => {
    if (phase !== "in_module") return;
    const q = state.questions[currentIndex];
    if (!q) return;
    const id = setInterval(() => {
      setAnswers((prev) => {
        const existing = prev[q.id] ?? blankAnswer();
        return { ...prev, [q.id]: { ...existing, timeSpent: existing.timeSpent + 1 } };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, currentIndex, state.questions]);

  // ---------- Keyboard shortcuts ----------
  // Both the action functions and the relevant state change every render; we
  // hold the latest in a ref so the once-attached keydown listener stays fresh.
  const shortcutRef = useRef({
    phase,
    currentQuestion: state.questions[currentIndex],
    answer: state.questions[currentIndex]
      ? (answers[state.questions[currentIndex].id] ?? blankAnswer())
      : null,
    isModalOpen:
      showNavigator || showDirections || showSubmitConfirm || showFullscreenWarning || showShortcuts,
    next: () => {},
    back: () => {},
    onAnswerChange: (_id: string, _patch: AnswerPatch) => {},
    toggleEliminator: () => {},
    toggleTimer: () => {},
    closeAllModals: () => {},
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inInput =
        tag === "INPUT" || tag === "TEXTAREA" || !!target?.isContentEditable;

      const ctx = shortcutRef.current;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();

      // Escape fires regardless of input focus or open modals â€” it always
      // means "get me out of whatever I just opened".
      if (k === "escape") {
        if (ctx.isModalOpen) {
          e.preventDefault();
          ctx.closeAllModals();
        }
        return;
      }

      // All other shortcuts are blocked while typing in an input or while
      // a modal is open (otherwise A/B/C/D inside the SPR field would
      // trigger choice selection).
      if (inInput) return;
      if (ctx.isModalOpen) return;
      if (ctx.phase !== "in_module") return;

      if (k === "arrowright" || k === "n") {
        e.preventDefault();
        ctx.next();
      } else if (k === "arrowleft" || k === "p") {
        e.preventDefault();
        ctx.back();
      } else if (k === "m") {
        e.preventDefault();
        if (ctx.currentQuestion) {
          ctx.onAnswerChange(ctx.currentQuestion.id, {
            isMarkedForReview: !ctx.answer?.isMarkedForReview,
          });
        }
      } else if (k === "e") {
        if (ctx.currentQuestion?.type === "MULTIPLE_CHOICE") {
          e.preventDefault();
          ctx.toggleEliminator();
        }
      } else if (k === "h") {
        e.preventDefault();
        ctx.toggleTimer();
      } else if (["a", "b", "c", "d"].includes(k)) {
        if (
          ctx.currentQuestion?.type === "MULTIPLE_CHOICE" &&
          ctx.currentQuestion.choices?.some((c) => c.label === k.toUpperCase())
        ) {
          e.preventDefault();
          ctx.onAnswerChange(ctx.currentQuestion.id, { response: k.toUpperCase() });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Focus / visibility logging (light anti-cheat) ----------
  useEffect(() => {
    const attemptId = state.attempt.id;
    function logEvent(type: "blur" | "focus" | "fullscreen_enter" | "fullscreen_exit") {
      fetch(`/api/attempts/${attemptId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, at: Date.now() }),
        keepalive: true,
      }).catch(() => {});
    }
    function onVisibility() {
      logEvent(document.hidden ? "blur" : "focus");
    }
    function onFullscreenChange() {
      const inFs = !!document.fullscreenElement;
      logEvent(inFs ? "fullscreen_enter" : "fullscreen_exit");
      if (!inFs) setShowFullscreenWarning(true);
    }
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [state.attempt.id]);

  // ---------- Mutators ----------
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  function onAnswerChange(
    questionId: string,
    patch: Partial<{
      response: string;
      isMarkedForReview: boolean;
      eliminatedChoices: Eliminated;
    }>,
  ) {
    setAnswers((prev) => {
      const existing = prev[questionId] ?? blankAnswer();
      const next = { ...existing, ...patch };
      schedulePersist(questionId, next, currentIndexRef.current);
      return { ...prev, [questionId]: next };
    });
  }

  // ---------- Navigation ----------
  function goTo(idx: number) {
    if (idx < 0 || idx >= state.questions.length) return;
    setCurrentIndex(idx);
    setShowNavigator(false);
    // Persist the current-index pointer immediately by piggybacking on the answer save.
    const q = state.questions[idx];
    if (!q) return;
    const a = answers[q.id] ?? blankAnswer();
    schedulePersist(q.id, a, idx);
  }

  function next() {
    if (currentIndex === state.questions.length - 1) setPhase("review");
    else goTo(currentIndex + 1);
  }
  function back() {
    if (phase === "review") {
      setPhase("in_module");
      return;
    }
    goTo(currentIndex - 1);
  }

  // ---------- Module submit / break / next ----------
  async function submitModule(auto: boolean) {
    if (phase === "submitting") return;
    setShowSubmitConfirm(false);
    setPhase("submitting");

    try {
      // Flush and await every pending debounced save before scoring. Fire-and-forget
      // here creates a race where submit can read the old answer set from Postgres.
      const pendingSaves = Object.entries(saveTimeoutRef.current).map(async ([qid, t]) => {
        clearTimeout(t);
        delete saveTimeoutRef.current[qid];
        const a = answers[qid];
        if (!a) return;
        const saveResponse = await fetch(`/api/attempts/${state.attempt.id}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: qid,
            response: a.response,
            isMarkedForReview: a.isMarkedForReview,
            eliminatedChoices: a.eliminatedChoices,
            timeSpent: a.timeSpent,
          }),
          keepalive: true,
        });
        if (!saveResponse.ok) throw new Error("Failed to save an answer before submission");
      });
      await Promise.all(pendingSaves);

      const res = await fetch(`/api/attempts/${state.attempt.id}/submit-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: state.module.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.code === "ATTEMPT_EXPIRED") {
          router.push("/dashboard");
          return;
        }
        alert(
          data.code === "TIME_EXPIRED"
            ? "Time expired. This module can no longer be submitted from the browser."
            : (data.error ?? "Failed to submit module"),
        );
        setPhase(auto ? "review" : "in_module");
        submittingRef.current = false;
        return;
      }
      if (data.status === "completed") {
        router.push(`/results/${state.attempt.id}`);
        return;
      }
      // Reload attempt state for the new current module / break.
      await reloadState();
    } catch {
      alert("Network error while submitting module.");
      setPhase(auto ? "review" : "in_module");
      submittingRef.current = false;
    }
  }

  async function reloadState() {
    setPhase("loading_next");
    const res = await fetch(`/api/attempts/${state.attempt.id}`);
    const data = await res.json();
    if (data.closed) {
      router.push("/dashboard");
      return;
    }
    if (data.completed) {
      router.push(`/results/${state.attempt.id}`);
      return;
    }
    if (!data.ok || !data.state) {
      alert("Could not load next module.");
      return;
    }
    const next: AttemptState = data.state;
    clockOffsetRef.current = next.serverNow - Date.now();
    setNow(Date.now() + clockOffsetRef.current);
    setState(next);
    setAnswers(buildAnswerMap(next.answers));
    setCurrentIndex(next.attempt.currentQuestionIndex || 0);
    setEliminatorActive(false);
    setShowNavigator(false);
    setShowDirections(false);
    submittingRef.current = false;
    // Reset per-module timer warnings so the next module re-fires them
    // when it crosses its own 1-minute / 0-second thresholds.
    oneMinWarnedRef.current = false;
    beepedRef.current = false;
    setTimeUp(false);
    setPhase(next.isOnBreak ? "break" : "in_module");
  }

  async function endBreak() {
    setPhase("loading_next");
    const res = await fetch(`/api/attempts/${state.attempt.id}/start-module`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.code === "ATTEMPT_EXPIRED") {
        router.push("/dashboard");
        return;
      }
      alert(data.error ?? "Failed to start next module");
      setPhase("break");
      return;
    }
    await reloadState();
  }

  // ---------- Derived ----------
  const currentQuestion: ClientQuestion | undefined = state.questions[currentIndex];
  const isLast = currentIndex === state.questions.length - 1;
  const sectionLabel =
    state.section.type === "READING_WRITING" ? "Reading and Writing" : "Math";
  const headerTitle = `Section ${state.sectionIndex + 1}, Module ${state.moduleNumber}: ${sectionLabel}`;

  // Keep the keyboard-shortcut ref in sync with the latest closures.
  shortcutRef.current = {
    phase,
    currentQuestion: state.questions[currentIndex],
    answer: state.questions[currentIndex]
      ? (answers[state.questions[currentIndex].id] ?? blankAnswer())
      : null,
    isModalOpen:
      showNavigator ||
      showDirections ||
      showSubmitConfirm ||
      showFullscreenWarning ||
      showShortcuts,
    next,
    back,
    onAnswerChange,
    toggleEliminator: () => setEliminatorActive((v) => !v),
    toggleTimer: () => setTimerHidden((v) => !v),
    closeAllModals: () => {
      setShowNavigator(false);
      setShowDirections(false);
      setShowSubmitConfirm(false);
      setShowFullscreenWarning(false);
      setShowShortcuts(false);
      setCalcOpen(false);
      setRefOpen(false);
    },
  };

  // ---------- Render ----------
  const isMath = state.section.type === "MATH";

  // Stale duplicate tab â†’ lock everything down. The OTHER tab (the most
  // recently opened one) is the live one; this overlay sits above the
  // entire test UI to prevent any interaction.
  if (isDuplicateTab) {
    return <DuplicateTabOverlay />;
  }

  return (
    <>
      {showResumeSplash && <ResumingSplash />}
      <ConnectivityBanner isOffline={isOffline} justReconnected={justReconnected} />
      {phase === "break" ? (
        <BreakScreen
          startedAt={state.breakStartedAt}
          serverOffsetMs={clockOffsetRef.current}
          nextSectionLabel="Math"
          onResume={endBreak}
          studentName={studentName}
        />
      ) : phase === "loading_next" || phase === "submitting" ? (
        <Loader
          text={
            timeUp
              ? "Time's up! Submitting your answersâ€¦"
              : "Loading next moduleâ€¦"
          }
        />
      ) : timeUp ? (
        // Brief 2-second overlay before submitModule runs â€” gives the
        // student a clear "what just happened" before the screen changes.
        <Loader text="Time's up! Submitting your answersâ€¦" />
      ) : (
        <div className="flex h-screen flex-col bg-white text-neutral-900">
          <TopBar
            title={headerTitle}
            remainingSeconds={remainingSeconds}
            timerHidden={timerHidden}
            onToggleTimer={() => setTimerHidden((v) => !v)}
            onShowDirections={() => setShowDirections(true)}
            onShowShortcuts={() => setShowShortcuts(true)}
            isMath={isMath}
            onOpenCalculator={() => setCalcOpen((v) => !v)}
            onOpenReference={() => setRefOpen((v) => !v)}
            calcOpen={calcOpen}
            refOpen={refOpen}
          />
          <PracticeBanner />

          {phase === "review" ? (
            <ReviewPage
              questions={state.questions}
              answers={answers}
              currentIndex={currentIndex}
              onJumpTo={(i) => {
                setPhase("in_module");
                goTo(i);
              }}
              onConfirmSubmit={() => setShowSubmitConfirm(true)}
            />
          ) : (
            currentQuestion && (
              <QuestionView
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                attemptId={state.attempt.id}
                answer={answers[currentQuestion.id] ?? blankAnswer()}
                eliminatorActive={eliminatorActive}
                onToggleEliminator={() => setEliminatorActive((v) => !v)}
                onChange={(patch) => onAnswerChange(currentQuestion.id, patch)}
              />
            )
          )}

          <BottomBar
            studentName={studentName}
            saveStatus={saveStatus}
            questionNumber={currentIndex + 1}
            totalQuestions={state.questions.length}
            isReview={phase === "review"}
            isLast={isLast}
            onBack={back}
            onNext={next}
            onOpenNavigator={() => setShowNavigator(true)}
            onGoToReview={() => setPhase("review")}
          />

          {showNavigator && (
            <NavigatorModal
              questions={state.questions}
              answers={answers}
              currentIndex={phase === "review" ? -1 : currentIndex}
              title={`${headerTitle} Questions`}
              onClose={() => setShowNavigator(false)}
              onJump={(i) => {
                setShowNavigator(false);
                setPhase("in_module");
                goTo(i);
              }}
              onGoToReview={() => {
                setShowNavigator(false);
                setPhase("review");
              }}
            />
          )}

          {showDirections && (
            <DirectionsModal
              sectionType={state.section.type}
              onClose={() => setShowDirections(false)}
            />
          )}

          {showSubmitConfirm && (
            <ConfirmDialog
              title="Submit this module?"
              message="You won't be able to return to this module after submitting."
              confirmLabel="Submit module"
              onCancel={() => setShowSubmitConfirm(false)}
              onConfirm={() => void submitModule(false)}
            />
          )}

          {showFullscreenWarning && (
            <ConfirmDialog
              title="You exited fullscreen"
              message="Test taking is intended to be distraction-free. You can return to fullscreen or continue without it."
              confirmLabel="Return to fullscreen"
              onCancel={() => setShowFullscreenWarning(false)}
              onConfirm={() => {
                setShowFullscreenWarning(false);
                document.documentElement
                  .requestFullscreen()
                  .catch(() => {});
              }}
            />
          )}

          <KeyboardShortcutsModal
            open={showShortcuts}
            onOpenChange={setShowShortcuts}
          />
        </div>
      )}

      {/*
        Math tools live at the root so the Desmos instance and any user-entered
        expressions persist across phase changes within a math section
        (in_module â†’ review â†’ loading_next â†’ in_module of Module 2).
      */}
      {isMath && (
        <>
          <DesmosCalculator open={calcOpen} onClose={() => setCalcOpen(false)} />
          <ReferenceSheet open={refOpen} onClose={() => setRefOpen(false)} />
        </>
      )}
    </>
  );
}

// ---------- Helpers ----------

function buildAnswerMap(answers: ClientAnswer[]): AnswerMap {
  const map: AnswerMap = {};
  for (const a of answers) {
    map[a.questionId] = {
      response: a.response,
      isMarkedForReview: a.isMarkedForReview,
      eliminatedChoices: a.eliminatedChoices,
      timeSpent: a.timeSpent,
    };
  }
  return map;
}

function blankAnswer() {
  return {
    response: "",
    isMarkedForReview: false,
    eliminatedChoices: [] as Eliminated,
    timeSpent: 0,
  };
}
