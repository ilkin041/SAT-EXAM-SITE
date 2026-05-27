"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

type Mode = "test" | "bank";

interface TestSummary {
  test: {
    title: string;
    mode: "ADAPTIVE" | "LINEAR";
    isPublic: boolean;
    adaptiveThreshold: number;
  };
  totalQuestions: number;
  sections: Array<{
    type: "READING_WRITING" | "MATH";
    order: number;
    module1TimeLimit: number;
    module2TimeLimit: number;
    modules: Array<{
      moduleNumber: number;
      difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
      questionCount: number;
    }>;
  }>;
}

interface BankPreviewRow {
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  domain: string;
  skill: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  stemPreview: string;
}

type Phase = "idle" | "validated" | "committing" | "done";

export function ImportForm() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>("test");
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");

  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [bankPreview, setBankPreview] = useState<{ count: number; questions: BankPreviewRow[] } | null>(null);

  function resetPreviews() {
    setTestSummary(null);
    setBankPreview(null);
    setErrors([]);
    setPhase("idle");
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    resetPreviews();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = await f.text();
    setText(t);
    resetPreviews();
  }

  function validate() {
    setErrors([]);
    setTestSummary(null);
    setBankPreview(null);

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch (err) {
      setErrors([`Invalid JSON: ${(err as Error).message}`]);
      return;
    }

    // Quick sanity check: mode-vs-payload mismatch is a common foot-gun, so
    // tell the user explicitly instead of letting the server hand back a
    // generic "unrecognized payload."
    const b = body as Record<string, unknown> | null;
    if (mode === "bank" && b?.import !== "questions") {
      setErrors([
        '(root): bank import expects a top-level `"import": "questions"` field. Switch to "Full Test Import" or fix the payload.',
      ]);
      return;
    }
    if (mode === "test" && !(b && "test" in b)) {
      setErrors([
        '(root): full-test import expects a top-level `"test"` object. Switch to "Question Bank Import" or fix the payload.',
      ]);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/import?dryRun=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrors(data.errors ?? [data.error ?? "Validation failed"]);
        setPhase("idle");
        return;
      }
      if (data.mode === "bank") {
        setBankPreview({ count: data.count, questions: data.questions });
      } else {
        setTestSummary(data.summary);
      }
      setPhase("validated");
    });
  }

  function commit() {
    if (phase !== "validated") return;
    setErrors([]);
    setPhase("committing");
    startTransition(async () => {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrors(data.errors ?? [data.error ?? "Import failed"]);
        setPhase("validated");
        return;
      }
      setPhase("done");

      if (data.mode === "bank") {
        toast(`${data.count} question${data.count === 1 ? "" : "s"} added to the bank`);
        router.push("/admin/questions");
      } else {
        router.push(`/admin/tests/${data.testId}`);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* ---------- Mode toggle ---------- */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1 text-sm">
        <ModeTab
          active={mode === "test"}
          onClick={() => switchMode("test")}
          label="Full Test Import"
        />
        <ModeTab
          active={mode === "bank"}
          onClick={() => switchMode("bank")}
          label="Question Bank Import"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <label className="block text-sm font-medium">Upload JSON file</label>
        <input
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Or paste JSON</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            resetPreviews();
          }}
          spellCheck={false}
          className="mt-2 min-h-[260px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
          placeholder={
            mode === "bank"
              ? '{ "import": "questions", "questions": [ ... ] }'
              : '{ "test": { ... }, "sections": [ ... ] }'
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={validate}
          disabled={pending || !text.trim()}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending && phase === "idle" ? "Validating…" : "Validate"}
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={pending || phase !== "validated"}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {phase === "committing"
            ? "Importing…"
            : mode === "bank"
              ? "Import to Bank"
              : "Import"}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
          <div className="mb-2 text-sm font-medium text-destructive">
            {errors.length} validation error{errors.length === 1 ? "" : "s"}
          </div>
          <ul className="space-y-1 text-xs text-destructive">
            {errors.map((e, i) => (
              <li key={i} className="font-mono">
                • {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {testSummary && phase !== "idle" && mode === "test" && (
        <TestPreview summary={testSummary} />
      )}

      {bankPreview && phase !== "idle" && mode === "bank" && (
        <BankPreview count={bankPreview.count} questions={bankPreview.questions} />
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-4 py-1.5 transition",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

function TestPreview({ summary }: { summary: TestSummary }) {
  return (
    <div className="rounded-lg border border-green-500/40 bg-green-50 p-5 dark:bg-green-950/20">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
        ✓ Looks good — review the preview, then click{" "}
        <span className="font-semibold">Import</span>.
      </div>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-muted-foreground">Title:</span>{" "}
          <span className="font-medium">{summary.test.title}</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Mode: {summary.test.mode}</span>
          <span>Public: {summary.test.isPublic ? "yes" : "no"}</span>
          {summary.test.mode === "ADAPTIVE" && (
            <span>Threshold: {summary.test.adaptiveThreshold}</span>
          )}
          <span>Total questions: {summary.totalQuestions}</span>
        </div>
        <div className="space-y-2 pt-2">
          {summary.sections.map((s, i) => (
            <div key={i} className="rounded-md border border-border bg-card p-3">
              <div className="mb-2 text-sm font-medium">
                {s.type === "READING_WRITING" ? "Reading & Writing" : "Math"}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({Math.round(s.module1TimeLimit / 60)} min / module)
                </span>
              </div>
              <ul className="space-y-0.5 text-xs">
                {s.modules.map((m, j) => (
                  <li key={j} className="text-muted-foreground">
                    Module {m.moduleNumber} ({m.difficulty}) — {m.questionCount} questions
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BankPreview({
  count,
  questions,
}: {
  count: number;
  questions: BankPreviewRow[];
}) {
  return (
    <div className="rounded-lg border border-green-500/40 bg-green-50 p-5 dark:bg-green-950/20">
      <div className="mb-3 text-sm font-medium text-green-700 dark:text-green-300">
        ✓ {count} question{count === 1 ? "" : "s"} will be added to the question bank.
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-2">Type</th>
              <th className="p-2">Domain</th>
              <th className="p-2">Diff.</th>
              <th className="p-2">Stem preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {questions.map((q, i) => (
              <tr key={i}>
                <td className="p-2 text-muted-foreground">
                  {q.type === "MULTIPLE_CHOICE" ? "MC" : "SPR"}
                </td>
                <td className="p-2">
                  {q.domain}
                  {q.skill && (
                    <span className="text-muted-foreground"> · {q.skill}</span>
                  )}
                </td>
                <td className="p-2 text-muted-foreground">{q.difficulty}</td>
                <td className="p-2">{q.stemPreview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
