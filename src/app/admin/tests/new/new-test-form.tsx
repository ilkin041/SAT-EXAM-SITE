"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTest } from "../actions";

export function NewTestForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"ADAPTIVE" | "LINEAR">("ADAPTIVE");
  const [isPublic, setIsPublic] = useState(false);
  const [threshold, setThreshold] = useState(0.6);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTest({
        title: title.trim(),
        description: description.trim() || null,
        mode,
        isPublic,
        adaptiveThreshold: threshold,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/admin/tests/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Practice Test 1"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-[80px]`}
          placeholder="What this test covers, when to use it, etc."
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "ADAPTIVE" | "LINEAR")}
            className={inputClass}
          >
            <option value="ADAPTIVE">Adaptive</option>
            <option value="LINEAR">Linear</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Adaptive threshold</span>
          <input
            type="number"
            step="0.05"
            min={0}
            max={1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            disabled={mode !== "ADAPTIVE"}
            className={inputClass}
          />
          <span className="text-xs text-muted-foreground">
            Module 1 fraction correct ≥ this routes to HARD Module 2.
          </span>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        <span>Public — anyone (signed out included) can take this test.</span>
      </label>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create test"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
