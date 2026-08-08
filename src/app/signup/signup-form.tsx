"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/password-field";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mismatch = confirm.length > 0 && confirm !== password;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Sign-up failed.");
        return;
      }
      const signed = await signIn("credentials", { email, password, redirect: false });
      if (!signed || signed.error) {
        setError("Account created, but auto-login failed. Try logging in manually.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive" live>
          {error}
        </Alert>
      )}

      <Field label="Name" optional>
        <Input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </Field>

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

      <PasswordField
        label="Password"
        autoComplete="new-password"
        required
        minLength={8}
        strength
        hint={password.length === 0 ? "Minimum 8 characters." : undefined}
        value={password}
        onValueChange={setPassword}
      />

      <PasswordField
        label="Confirm password"
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
        className="mt-2 w-full"
        disabled={mismatch}
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
