"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/password-field";
import { useToast } from "@/components/toast";

export function ResetPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mismatch = confirm.length > 0 && confirm !== password;

  if (!token) {
    return (
      <Alert variant="destructive" title="Missing reset link">
        This page needs to be opened from the link in your password reset email.{" "}
        <Link href="/forgot-password" className="underline">
          Request a new one.
        </Link>
      </Alert>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not reset password.");
        return;
      }
      // Auto sign-in with the new credentials.
      const signed = await signIn("credentials", {
        email: data.email,
        password,
        redirect: false,
      });
      if (!signed || signed.error) {
        toast("Password updated. Please sign in.");
        router.push("/login");
        return;
      }
      toast("Password updated successfully.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive" live>
          {error}
          {error.toLowerCase().includes("expired") && (
            <>
              {" "}
              <Link href="/forgot-password" className="underline">
                Request a new one
              </Link>
              .
            </>
          )}
        </Alert>
      )}

      <PasswordField
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Minimum 8 characters."
        value={password}
        onValueChange={setPassword}
      />

      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        required
        value={confirm}
        onValueChange={setConfirm}
        error={mismatch ? "Passwords don't match." : undefined}
      />

      {/* T4.1: the page's one gradient. The brand panel beside it is flat. */}
      <Button
        type="submit"
        variant="gradient"
        loading={pending}
        disabled={mismatch}
        className="mt-2 w-full"
      >
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
