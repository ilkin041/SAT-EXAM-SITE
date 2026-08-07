"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/password-field";
import { useToast } from "@/components/toast";

// ---------- Name ----------

export function ChangeNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = name.trim() !== initialName.trim();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validated here rather than by disabling the button: a permanently greyed
    // "Save" with no explanation reads as broken.
    if (name.trim().length === 0) {
      setError("Enter a name before saving.");
      return;
    }
    if (!dirty) {
      setError("Your name hasn't changed. Edit the field, then save.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/account/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not update name.");
        return;
      }
      toast("Name updated");
      // Refresh server components so the nav reflects the new name.
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive" live>
          {error}
        </Alert>
      )}

      <Field
        label="Name"
        hint="Used in the welcome message and the navigation menu."
      >
        <Input
          type="text"
          autoComplete="name"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </Field>

      <div>
        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ---------- Password ----------

export function ChangePasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mismatch = confirm.length > 0 && confirm !== next;

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Every rule is checked here instead of gating the button, so the reason a
    // submit didn't go through is always stated rather than implied.
    if (!current) {
      setError("Enter your current password.");
      return;
    }
    if (!next || !confirm) {
      setError("Fill in your new password and the confirmation.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/account/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not update password.");
        return;
      }
      toast("Password updated");
      reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive" live>
          {error}
        </Alert>
      )}

      <PasswordField
        label="Current password"
        autoComplete="current-password"
        required
        value={current}
        onValueChange={setCurrent}
      />

      <PasswordField
        label="New password"
        autoComplete="new-password"
        required
        minLength={8}
        strength
        hint={next.length === 0 ? "Minimum 8 characters." : undefined}
        value={next}
        onValueChange={setNext}
      />

      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        required
        value={confirm}
        onValueChange={setConfirm}
        error={mismatch ? "Passwords don't match." : undefined}
      />

      <div>
        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
