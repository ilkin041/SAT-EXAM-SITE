"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import {
  removeQuestionFromModule,
  reorderModuleQuestion,
} from "../module-question-actions";
import { updateSectionTimes } from "../actions";
import { AssignFromBankPanel } from "@/components/assign-from-bank-panel";

interface QuestionRow {
  id: string;
  order: number;
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  domain: string;
  stem: string;
}

interface ModuleRow {
  id: string;
  moduleNumber: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  questions: QuestionRow[];
}

interface Props {
  section: {
    id: string;
    type: "READING_WRITING" | "MATH";
    module1TimeLimit: number;
    module2TimeLimit: number;
  };
  modules: ModuleRow[];
}

export function SectionEditor({ section, modules }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [m1, setM1] = useState(Math.round(section.module1TimeLimit / 60));
  const [m2, setM2] = useState(Math.round(section.module2TimeLimit / 60));
  const [error, setError] = useState<string | null>(null);

  // Which module's panel is open ("" = none).
  const [panelModuleId, setPanelModuleId] = useState<string>("");

  function saveTimes() {
    setError(null);
    startTransition(async () => {
      const res = await updateSectionTimes({
        sectionId: section.id,
        module1TimeLimit: m1 * 60,
        module2TimeLimit: m2 * 60,
      });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const sectionLabel =
    section.type === "READING_WRITING" ? "Reading & Writing" : "Math";

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h3 className="font-medium">{sectionLabel}</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Module 1</span>
            <input
              type="number"
              min={1}
              value={m1}
              onChange={(e) => setM1(Number(e.target.value))}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-right"
            />
            <span className="text-muted-foreground">min</span>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Module 2</span>
            <input
              type="number"
              min={1}
              value={m2}
              onChange={(e) => setM2(Number(e.target.value))}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-right"
            />
            <span className="text-muted-foreground">min</span>
          </label>
          <button
            type="button"
            onClick={saveTimes}
            disabled={pending}
            className="rounded-md border border-input px-3 py-1 hover:bg-accent disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save times"}
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="divide-y divide-border">
        {modules.map((m) => (
          <ModuleBlock
            key={m.id}
            mod={m}
            sectionType={section.type}
            onOpenPanel={() => setPanelModuleId(m.id)}
          />
        ))}
      </div>

      {/* Slide-over for whichever module the admin opened. Renders only when active. */}
      {modules
        .filter((m) => m.id === panelModuleId)
        .map((m) => (
          <AssignFromBankPanel
            key={m.id}
            open={true}
            moduleId={m.id}
            moduleLabel={`${sectionLabel} · Module ${m.moduleNumber} (${m.difficulty})`}
            moduleSectionType={section.type}
            initiallyAssignedIds={m.questions.map((q) => q.id)}
            onClose={() => setPanelModuleId("")}
          />
        ))}
    </div>
  );
}

function ModuleBlock({
  mod,
  sectionType,
  onOpenPanel,
}: {
  mod: ModuleRow;
  sectionType: "READING_WRITING" | "MATH";
  onOpenPanel: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const empty = mod.questions.length === 0;
  const expectedCount = sectionType === "READING_WRITING" ? 27 : 22;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const difficultyMix = (["EASY", "MEDIUM", "HARD"] as const)
    .map((difficulty) => ({
      difficulty,
      count: mod.questions.filter((question) => question.difficulty === difficulty).length,
    }))
    .filter((item) => item.count > 0);

  function move(questionId: string, targetIndex: number) {
    startTransition(async () => {
      const res = await reorderModuleQuestion(mod.id, questionId, targetIndex);
      if (!res.ok) {
        alert(res.error ?? "Reorder failed");
        return;
      }
      router.refresh();
    });
  }

  function remove(questionId: string) {
    if (
      !confirm("Remove this question from the module? (It stays in the question bank.)")
    )
      return;
    startTransition(async () => {
      const res = await removeQuestionFromModule(mod.id, questionId);
      if (!res.ok) {
        alert(res.error ?? "Remove failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Module {mod.moduleNumber}</span>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
            {mod.difficulty}
          </span>
          <span className="text-xs text-muted-foreground">
            {mod.questions.length} / {expectedCount} questions
          </span>
          {!empty && mod.questions.length === expectedCount && (
            <span className="rounded-md border border-green-500/30 bg-green-50 px-2 py-0.5 text-xs text-green-800 dark:bg-green-950/20 dark:text-green-200">
              Ready
            </span>
          )}
          {empty && (
            <span className="rounded-md border border-amber-400/40 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
              ⚠ No questions yet
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenPanel}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          + Add from bank
        </button>
      </div>

      {empty ? (
        <p className="rounded-md border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
          This module needs at least one question before the test can be started.
        </p>
      ) : (
        <>
        <div className="mb-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {difficultyMix.map(({ difficulty, count }) => (
            <span key={difficulty} className="rounded-full border border-border bg-muted px-2 py-0.5">
              {difficulty}: {count}
            </span>
          ))}
          {mod.questions.some((question) => question.difficulty === "MIXED") && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5">
              MIXED: {mod.questions.filter((question) => question.difficulty === "MIXED").length}
            </span>
          )}
        </div>
        <ol className="space-y-1">
          {mod.questions.map((q, i) => {
            const isFirst = i === 0;
            const isLastQ = i === mod.questions.length - 1;
            return (
              <li
                key={q.id}
                draggable={!pending}
                onDragStart={() => setDraggedId(q.id)}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedId && draggedId !== q.id) move(draggedId, i);
                  setDraggedId(null);
                }}
                className="flex cursor-grab items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/30 active:cursor-grabbing"
              >
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="mt-0.5 w-6 shrink-0 text-right text-caption tabular text-muted-foreground">
                  {i + 1}.
                </span>
                <Link
                  href={`/admin/questions/${q.id}`}
                  className="line-clamp-2 flex-1 hover:underline"
                  title={stripHtml(q.stem)}
                >
                  {stripHtml(q.stem)}
                </Link>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {q.type === "MULTIPLE_CHOICE" ? "MC" : "SPR"} · {q.difficulty} · {q.domain}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(q.id, i - 1)}
                    disabled={pending || isFirst}
                    title="Move up"
                    aria-label={`Move question ${i + 1} up`}
                    className="rounded p-1 text-xs hover:bg-accent disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(q.id, i + 1)}
                    disabled={pending || isLastQ}
                    title="Move down"
                    aria-label={`Move question ${i + 1} down`}
                    className="rounded p-1 text-xs hover:bg-accent disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(q.id)}
                    disabled={pending}
                    title="Remove from module"
                    aria-label={`Remove question ${i + 1} from this module`}
                    className="rounded p-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        </>
      )}
    </div>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}
