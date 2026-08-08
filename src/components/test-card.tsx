"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, PlayCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@/components/ui/modal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/toast";

interface Props {
  testId: string;
  title: string;
  description: string | null;
  mode: "ADAPTIVE" | "LINEAR";
  sectionCount: number;
  questionCount: number;
  /** Existing IN_PROGRESS attempt for this user + test, if any. */
  inProgressAttemptId: string | null;
}

/**
 * Dashboard test card. Two render modes:
 *
 *  - **No in-progress attempt** → links straight to the pre-test page.
 *  - **In-progress attempt** → primary action is "Continue test",
 *    with a secondary "Start Fresh" that opens a confirmation modal. Starting
 *    fresh abandons the existing attempt server-side via the start endpoint's
 *    `fresh=1` flag.
 */
export function TestCard({
  testId,
  title,
  description,
  mode,
  sectionCount,
  questionCount,
  inProgressAttemptId,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function startFresh() {
    startTransition(async () => {
      const res = await fetch(`/api/tests/${testId}/start?fresh=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // See begin-button.tsx — the server cannot measure the viewport.
        body: JSON.stringify({ viewportWidth: window.innerWidth }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast(data.error || "Could not start a new attempt.", "error");
        return;
      }
      router.push(`/test/${testId}/start`);
    });
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-6 pl-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated hover:border-primary/20">
      {/* Left accent strip */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-primary transition-all duration-300 group-hover:w-2.5" />

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {inProgressAttemptId && (
            <Badge variant="warning" className="gap-1 animate-pulse">
              <PlayCircle className="h-3 w-3" />
              In progress
            </Badge>
          )}
          {/*
            The badge is the trigger, so it has to be focusable and it has to
            say what it is: "ADAPTIVE" alone is a mode name, not a definition,
            and the definition is the only thing the tooltip carries. A
            keyboard user reaches it with Tab, a phone with a tap.
          */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="rounded-full">
                <Badge variant={mode === "ADAPTIVE" ? "purple" : "info"}>
                  {mode}
                </Badge>
                <span className="sr-only">
                  {mode === "ADAPTIVE" ? "Adaptive" : "Linear"} test — what this
                  means
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {mode === "ADAPTIVE"
                ? "The second module's difficulty is set by how you do on the first, like the real Digital SAT."
                : "Every student sees the same questions in the same order, whatever they score."}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/*
        Always occupies two lines, described or not. Only one seeded test has a
        description, and rendering the paragraph conditionally left the meta row
        and CTA at different heights across a row of cards.
        `2.84rem` = 2 × text-sm (0.875rem) × leading-relaxed (1.625).
      */}
      <p className="mt-2 line-clamp-2 min-h-[2.84rem] text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {sectionCount} section{sectionCount === 1 ? "" : "s"}
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          {questionCount} question{questionCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-5 flex-1" />

      {inProgressAttemptId ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {/*
            T1.8: was `bg-gradient-warm`. The dashboard's single warm gradient
            now lives on the history table's "Continue test"; a rail of cards
            each carrying one is exactly what the budget exists to stop. The
            amber "In progress" badge above still carries the state.
          */}
          <Button asChild className="flex-1 active-press">
            <Link
              href={`/test/attempt/${inProgressAttemptId}`}
              className="flex items-center justify-center gap-1.5"
            >
              Continue test
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Button>
          <Modal open={confirmOpen} onOpenChange={setConfirmOpen}>
            <ModalTrigger asChild>
              <Button variant="secondary" className="sm:w-auto hover-lift active-press">
                <RotateCcw className="h-4 w-4" />
                Start fresh
              </Button>
            </ModalTrigger>
            <ModalContent
              variant="destructive"
              dismissable={!pending}
              title="Start a new attempt?"
            >
              <ModalBody>
                <p className="text-body text-muted-foreground">
                  Your in-progress attempt for{" "}
                  <span className="font-medium text-foreground">{title}</span>{" "}
                  will be marked as abandoned and you&apos;ll begin a fresh
                  attempt. This can&apos;t be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmOpen(false)}
                  disabled={pending}
                  className="hover-lift active-press"
                >
                  Keep my progress
                </Button>
                <Button
                  variant="destructive"
                  loading={pending}
                  onClick={startFresh}
                  className="hover-lift active-press"
                >
                  {pending ? "Starting…" : "Start fresh"}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
      ) : (
        // The same action on every card in the rail, so it takes `soft`: still
        // the card's primary action, but five of them do not fight the page.
        // The left accent strip carries the brand.
        <Button asChild variant="soft" className="mt-4 w-full active-press">
          <Link href={`/test/${testId}/start`} className="flex items-center justify-center gap-1.5">
            Start test
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </Button>
      )}
    </div>
  );
}
