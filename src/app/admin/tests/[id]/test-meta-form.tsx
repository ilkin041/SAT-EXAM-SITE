"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTest } from "../actions";

interface Initial {
  id: string;
  title: string;
  description: string;
  mode: "ADAPTIVE" | "LINEAR";
  isPublic: boolean;
  adaptiveThreshold: number;
}

export function TestMetaForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [mode, setMode] = useState<"ADAPTIVE" | "LINEAR">(initial.mode);
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [threshold, setThreshold] = useState(initial.adaptiveThreshold);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateTest({
        id: initial.id,
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
      setSavedAt(new Date());
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">Title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-[70px]`}
        />
      </label>

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
      </label>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        <span>Public</span>
      </label>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {savedAt && !pending && (
          <span className="text-xs text-muted-foreground">
            Saved at {savedAt.toLocaleTimeString()}
          </span>
        )}
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
