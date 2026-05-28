"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Shortcut = { keys: string[]; description: string };

const SHORTCUTS: { section: string; rows: Shortcut[] }[] = [
  {
    section: "Answer",
    rows: [
      { keys: ["A", "B", "C", "D"], description: "Select an answer choice" },
      { keys: ["M"], description: "Mark current question for review" },
      { keys: ["E"], description: "Toggle the answer eliminator" },
    ],
  },
  {
    section: "Navigation",
    rows: [
      { keys: ["→", "N"], description: "Next question" },
      { keys: ["←", "P"], description: "Previous question" },
    ],
  },
  {
    section: "Display",
    rows: [
      { keys: ["H"], description: "Hide / show the timer" },
      { keys: ["Esc"], description: "Close any open menu or modal" },
    ],
  },
];

/**
 * Reference dialog opened from the "More" menu. Pure presentational — the
 * actual keyboard handler lives in test-interface.tsx and stays the source
 * of truth for which shortcuts are wired.
 */
export function KeyboardShortcutsModal({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-elevated data-[state=open]:animate-slide-up">
          <div className="flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
              <Keyboard className="h-5 w-5 text-primary" aria-hidden />
              Keyboard shortcuts
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-5 text-sm">
            {SHORTCUTS.map((s) => (
              <section key={s.section}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.section}
                </h3>
                <ul className="space-y-2">
                  {s.rows.map((r) => (
                    <li
                      key={r.description}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-foreground">{r.description}</span>
                      <span className="flex items-center gap-1">
                        {r.keys.map((k, i) => (
                          <span key={k} className="flex items-center gap-1">
                            <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 font-mono text-xs">
                              {k}
                            </kbd>
                            {i < r.keys.length - 1 && (
                              <span className="text-xs text-muted-foreground">or</span>
                            )}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-6 rounded-md border border-blue-500/20 bg-blue-50/60 px-3 py-2 text-xs text-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
            Shortcuts are disabled while you&apos;re typing in the answer
            field.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
