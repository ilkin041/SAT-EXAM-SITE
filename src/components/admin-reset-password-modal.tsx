"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, KeyRound, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  userName: string;
  trigger?: React.ReactNode;
}

/**
 * Reset-password modal for the admin user detail page.
 *
 * Two-step flow:
 *  1. Confirmation step — explains what's about to happen.
 *  2. Result step — shows the generated temp password (only this client
 *     session ever sees it) with a copy button.
 *
 * The dialog can't be dismissed while the temp password is being generated,
 * but stays open after success so the admin can read/copy the password at
 * their pace before clicking Done.
 */
export function AdminResetPasswordModal({ userId, userName, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setTempPassword(null);
    setError(null);
    setCopied(false);
    setPending(false);
  }

  async function onConfirm() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      setTempPassword(data.tempPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setPending(false);
    }
  }

  async function copyToClipboard() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore; user can copy manually
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger asChild>
        {trigger ?? (
          <Button variant="destructive" size="sm">
            <KeyRound className="h-4 w-4" />
            Reset password
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          // Only allow closing via the close button once we've shown the temp
          // password — accidental dismissal would lose the only copy.
          onPointerDownOutside={(e) => {
            if (tempPassword || pending) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (tempPassword || pending) e.preventDefault();
          }}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-elevated data-[state=open]:animate-slide-up"
        >
          {tempPassword ? (
            <>
              <Dialog.Title className="text-lg font-semibold">
                Temporary password generated
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Share this password with{" "}
                <span className="font-medium text-foreground">{userName}</span>.
                It won&apos;t be shown again.
              </Dialog.Description>
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <code className="flex-1 font-mono text-base tracking-wide text-foreground">
                  {tempPassword}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant={copied ? "primary" : "secondary"}
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The student should change it from Account Settings after their
                first sign-in.
              </p>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setOpen(false)}>Done</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                </div>
                <Dialog.Title className="text-lg font-semibold">
                  Reset password for {userName}?
                </Dialog.Title>
              </div>
              <Dialog.Description className="mt-3 text-sm text-muted-foreground">
                This will replace the student&apos;s password with a randomly
                generated temporary password. You can share it with them and
                they should change it after signing in.
              </Dialog.Description>
              {error && (
                <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={onConfirm}
                  loading={pending}
                >
                  {pending ? "Resetting…" : "Reset password"}
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
