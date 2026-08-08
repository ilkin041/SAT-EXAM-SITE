"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not send reset link. Please try again.");
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <Alert variant="success" title="Check your email" live>
        If an account exists for{" "}
        <span className="font-medium text-foreground">{email}</span>, we&apos;ve
        sent a password reset link. The link expires in 1 hour.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive" live>
          {error}
        </Alert>
      )}

      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>

      {/* T4.1: the page's one gradient. The brand panel beside it is flat. */}
      <Button type="submit" variant="gradient" loading={pending} className="mt-2 w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
