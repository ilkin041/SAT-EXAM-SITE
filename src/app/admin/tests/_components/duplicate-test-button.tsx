"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { duplicateTest } from "../actions";

interface Props {
  testId: string;
  originalTitle: string;
}

/**
 * "Duplicate" button on each row of /admin/tests. Opens a modal with an
 * editable name field (pre-filled "Copy of …"), submits via the
 * duplicateTest server action, redirects to the new test detail page on
 * success.
 */
export function DuplicateTestButton({ testId, originalTitle }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`Copy of ${originalTitle}`);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Reset the title each time the modal opens so the user starts from a
    // clean default if they cancelled and came back.
    if (next) setTitle(`Copy of ${originalTitle}`);
  }

  function onConfirm() {
    if (!title.trim()) {
      toast("Please enter a title.", "error");
      return;
    }
    startTransition(async () => {
      const res = await duplicateTest({ testId, newTitle: title.trim() });
      if (!res.ok) {
        toast(res.error || "Duplication failed", "error");
        return;
      }
      toast("Test duplicated successfully");
      setOpen(false);
      router.push(`/admin/tests/${res.testId}`);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Duplicate test"
          title="Duplicate"
        >
          <Copy className="h-4 w-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-elevated data-[state=open]:animate-slide-up">
          <Dialog.Title className="text-lg font-semibold">Duplicate test?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Copies every section, module, and question assignment. The new
            test starts as <span className="font-medium text-foreground">private</span>;
            you can publish it after reviewing.
          </Dialog.Description>
          <div className="mt-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">New title</span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Test title"
                autoFocus
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={onConfirm} loading={pending}>
              {pending ? "Duplicating…" : "Duplicate"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
