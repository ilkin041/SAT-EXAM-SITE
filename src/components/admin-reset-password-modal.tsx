"use client";

import { useState } from "react";
import { Copy, KeyRound, Check } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@/components/ui/modal";

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
 * their pace before clicking Done. Both of those are `Modal`'s `dismissable`
 * prop since T1.5, in place of a pair of hand-written `preventDefault`s.
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
    <Modal
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <ModalTrigger asChild>
        {trigger ?? (
          <Button variant="destructive" size="sm">
            <KeyRound className="h-4 w-4" />
            Reset password
          </Button>
        )}
      </ModalTrigger>

      {tempPassword ? (
        <ModalContent
          // The one copy of the password is on screen. Esc, a stray click
          // outside and the ✕ all disappear until the admin has said Done —
          // dismissing by accident here means resetting again.
          dismissable={false}
          title="Temporary password generated"
          description={
            <>
              Share this password with{" "}
              <span className="font-medium text-foreground">{userName}</span>.
              It won&apos;t be shown again.
            </>
          }
        >
          <ModalBody>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-paper-sunk p-3">
              <code className="flex-1 break-all font-mono text-base tracking-wide text-foreground">
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
            <p className="mt-3 text-caption text-muted-foreground">
              The student should change it from Account Settings after their
              first sign-in.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </ModalFooter>
        </ModalContent>
      ) : (
        <ModalContent
          variant="destructive"
          dismissable={!pending}
          title={`Reset password for ${userName}?`}
          description="This replaces the student's password with a randomly generated temporary one. You can share it with them, and they should change it after signing in."
        >
          <ModalBody>
            {error ? (
              <Alert variant="destructive" live title="Reset failed">
                {error}
              </Alert>
            ) : (
              <p className="text-body text-muted-foreground">
                The student&apos;s current password stops working immediately.
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} loading={pending}>
              {pending ? "Resetting…" : "Reset password"}
            </Button>
          </ModalFooter>
        </ModalContent>
      )}
    </Modal>
  );
}
