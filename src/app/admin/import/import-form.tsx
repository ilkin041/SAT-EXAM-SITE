"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileJson,
  FileText,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [filename, setFilename] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");

  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [bankPreview, setBankPreview] = useState<{
    count: number;
    questions: BankPreviewRow[];
  } | null>(null);

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

  async function loadFile(file: File) {
    setFilename(file.name);
    const t = await file.text();
    setText(t);
    resetPreviews();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void loadFile(f);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void loadFile(f);
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
    <div className="space-y-6">
      {/* ---------- Mode toggle (large cards) ---------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModeCard
          active={mode === "test"}
          icon={FileText}
          title="Full Test Import"
          description="Build a new test from a JSON tree of sections, modules, and questions."
          onClick={() => switchMode("test")}
        />
        <ModeCard
          active={mode === "bank"}
          icon={BookOpen}
          title="Question Bank Import"
          description="Add standalone questions to the global bank for later assignment."
          onClick={() => switchMode("bank")}
        />
      </div>

      {/* ---------- Drag & drop zone ---------- */}
      <label
        htmlFor="import-file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors duration-150",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/60 hover:bg-accent/40",
        )}
      >
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Upload className="h-6 w-6" aria-hidden />
        </div>
        <div className="mt-3 text-sm font-medium text-foreground">
          Drop your JSON file here or click to browse
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {filename ? (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <FileJson className="h-3.5 w-3.5" />
              {filename}
            </span>
          ) : (
            "JSON files only · up to 5 MB"
          )}
        </div>
        <input
          id="import-file"
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          className="sr-only"
        />
      </label>

      {/* ---------- Paste JSON (collapsible) ---------- */}
      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium hover:bg-accent/40">
          Or paste JSON instead
        </summary>
        <div className="border-t border-border p-4">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFilename(null);
              resetPreviews();
            }}
            spellCheck={false}
            className="min-h-[260px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder={
              mode === "bank"
                ? '{ "import": "questions", "questions": [ ... ] }'
                : '{ "test": { ... }, "sections": [ ... ] }'
            }
          />
        </div>
      </details>

      {/* ---------- Actions ---------- */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={validate}
          loading={pending && phase === "idle"}
          disabled={pending || !text.trim()}
        >
          {pending && phase === "idle" ? "Validating…" : "Validate"}
        </Button>
        {phase === "validated" && (
          <Button
            type="button"
            onClick={commit}
            loading={phase === "committing" || (pending && phase !== "idle")}
            disabled={pending || phase !== "validated"}
          >
            {phase === "committing"
              ? "Importing…"
              : mode === "bank"
                ? "Import to Bank"
                : "Import"}
          </Button>
        )}
      </div>

      {/* ---------- Validation results ---------- */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
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

function ModeCard({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors duration-150",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/40",
      )}
    >
      <div
        className={cn(
          "shrink-0 rounded-lg p-2",
          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

function TestPreview({ summary }: { summary: TestSummary }) {
  return (
    <div className="rounded-xl border border-green-500/30 bg-green-50 p-5 dark:bg-green-950/20">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-300">
        <CheckCircle2 className="h-4 w-4" />
        Looks good — review the preview, then click <span className="font-semibold">Import</span>.
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
    <div className="rounded-xl border border-green-500/30 bg-green-50 p-5 dark:bg-green-950/20">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-300">
        <CheckCircle2 className="h-4 w-4" />
        {count} question{count === 1 ? "" : "s"} will be added to the question bank.
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
