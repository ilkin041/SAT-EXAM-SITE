"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

interface Strength {
  score: 1 | 2 | 3;
  label: string;
  color: string;
}

function scorePassword(pw: string): Strength | null {
  if (pw.length === 0) return null;
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  const score = Math.min(3, Math.max(1, Math.floor(s / 1.5))) as 1 | 2 | 3;
  const map: Record<1 | 2 | 3, Strength> = {
    1: { score, label: "Weak", color: "bg-destructive" },
    2: { score, label: "Medium", color: "bg-amber-500" },
    3: { score, label: "Strong", color: "bg-green-600" },
  };
  return map[score];
}

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
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">Name</span>
        <Input
          type="text"
          autoComplete="name"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        <span className="text-xs text-muted-foreground">
          Used in the welcome message and the navigation menu.
        </span>
      </label>
      <div>
        <Button type="submit" loading={pending} disabled={!dirty || pending}>
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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const strength = scorePassword(next);
  const mismatch = confirm.length > 0 && confirm !== next;

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
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
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <PasswordField
        label="Current password"
        autoComplete="current-password"
        value={current}
        onChange={setCurrent}
        show={showCurrent}
        onToggleShow={() => setShowCurrent((v) => !v)}
      />

      <div>
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          show={showNew}
          onToggleShow={() => setShowNew((v) => !v)}
          minLength={8}
        />
        {strength ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    strength.score >= i ? strength.color : "bg-muted",
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{strength.label}</span>
          </div>
        ) : (
          <span className="mt-1.5 block text-xs text-muted-foreground">
            Minimum 8 characters.
          </span>
        )}
      </div>

      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        show={showConfirm}
        onToggleShow={() => setShowConfirm((v) => !v)}
        invalid={mismatch}
        hint={mismatch ? "Passwords don't match." : undefined}
      />

      <div>
        <Button
          type="submit"
          loading={pending}
          disabled={pending || mismatch || !current || !next || !confirm}
        >
          {pending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}

function PasswordField({
  label,
  autoComplete,
  value,
  onChange,
  show,
  onToggleShow,
  invalid,
  hint,
  minLength,
}: {
  label: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  invalid?: boolean;
  hint?: string;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "pr-10",
            invalid && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && (
        <span className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
          {hint}
        </span>
      )}
    </label>
  );
}
