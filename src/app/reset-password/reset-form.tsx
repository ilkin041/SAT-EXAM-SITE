"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mismatch = confirm.length > 0 && confirm !== password;

  if (!token) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <div className="font-medium">Missing reset link</div>
          <p className="mt-1 text-xs">
            This page needs to be opened from the link in your password reset
            email.{" "}
            <Link href="/forgot-password" className="underline">
              Request a new one.
            </Link>
          </p>
        </div>
      </div>
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
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <span>{error}</span>
            {error.toLowerCase().includes("expired") && (
              <>
                {" "}
                <Link href="/forgot-password" className="underline">
                  Request a new one
                </Link>
                .
              </>
            )}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">New password</span>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <span className="text-xs text-muted-foreground">Minimum 8 characters.</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">Confirm new password</span>
        <Input
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={cn(mismatch && "border-destructive focus-visible:ring-destructive")}
        />
        {mismatch && (
          <span className="text-xs text-destructive">Passwords don&apos;t match.</span>
        )}
      </label>

      <Button type="submit" loading={pending} disabled={mismatch} className="mt-2 w-full">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
