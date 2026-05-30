"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, PlayCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
 *  - **In-progress attempt** → primary action is "Continue Test" (yellow),
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
      const res = await fetch(`/api/tests/${testId}/start?fresh=1`, { method: "POST" });
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
          <Badge variant={mode === "ADAPTIVE" ? "purple" : "info"}>{mode}</Badge>
        </div>
      </div>

      {description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}

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
          <Button
            asChild
            className="flex-1 bg-gradient-warm text-white border-transparent hover:opacity-95 hover:glow-warm active-press transition-all duration-200"
          >
            <Link href={`/test/attempt/${inProgressAttemptId}`} className="flex items-center justify-center gap-1.5">
              Continue test
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Button>
          <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Dialog.Trigger asChild>
              <Button variant="secondary" className="sm:w-auto hover-lift active-press">
                <RotateCcw className="h-4 w-4" />
                Start fresh
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-elevated data-[state=open]:animate-slide-up">
                <Dialog.Title className="text-lg font-semibold">
                  Start a new attempt?
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                  Your in-progress attempt for{" "}
                  <span className="font-medium text-foreground">{title}</span>{" "}
                  will be marked as abandoned and you&apos;ll begin a fresh
                  attempt. This can&apos;t be undone.
                </Dialog.Description>
                <div className="mt-6 flex justify-end gap-2">
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
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ) : (
        <Button
          asChild
          className="mt-4 w-full bg-gradient-primary text-white border-transparent hover:opacity-95 hover:glow-primary active-press transition-all duration-200"
        >
          <Link href={`/test/${testId}/start`} className="flex items-center justify-center gap-1.5">
            Start test
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </Button>
      )}
    </div>
  );
}
