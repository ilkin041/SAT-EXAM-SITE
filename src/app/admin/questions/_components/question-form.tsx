"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QuestionPreview, type PreviewChoice } from "@/components/question-preview";
import { ImageUploader } from "@/components/image-uploader";
import { DeleteQuestionModal } from "@/components/delete-question-modal";
import type { QuestionAssignment } from "../actions";
import { createQuestion, updateQuestion } from "../actions";

type Type = "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
type Difficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";
type SectionType = "READING_WRITING" | "MATH";
type ImagePosition = "TOP" | "INLINE";

interface FormValues {
  sectionType: SectionType;
  type: Type;
  domain: string;
  skill: string;
  difficulty: Difficulty;
  passage: string;
  stem: string;
  imageUrl: string;
  imagePosition: ImagePosition;
  imageMaxWidth: number | null;
  choices: PreviewChoice[] | null;
  correctAnswer: string;
  acceptedAnswers: string[] | null;
  explanation: string;
}

interface Props {
  mode: "create" | "edit";
  questionId?: string;
  initial?: Partial<FormValues>;
  /** Module assignments — passed straight into the delete modal so it skips its own fetch. */
  assignments?: QuestionAssignment[];
}

const EMPTY_CHOICES: PreviewChoice[] = [
  { label: "A", text: "" },
  { label: "B", text: "" },
  { label: "C", text: "" },
  { label: "D", text: "" },
];

export function QuestionForm({ mode, questionId, initial, assignments = [] }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState<FormValues>({
    sectionType: initial?.sectionType ?? "READING_WRITING",
    type: initial?.type ?? "MULTIPLE_CHOICE",
    domain: initial?.domain ?? "",
    skill: initial?.skill ?? "",
    difficulty: initial?.difficulty ?? "MEDIUM",
    passage: initial?.passage ?? "",
    stem: initial?.stem ?? "",
    imageUrl: initial?.imageUrl ?? "",
    imagePosition: initial?.imagePosition ?? "INLINE",
    imageMaxWidth: initial?.imageMaxWidth ?? null,
    choices: initial?.choices ?? EMPTY_CHOICES,
    correctAnswer: initial?.correctAnswer ?? "A",
    acceptedAnswers: initial?.acceptedAnswers ?? [""],
    explanation: initial?.explanation ?? "",
  });

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setChoice(idx: number, text: string) {
    const next = [...(values.choices ?? EMPTY_CHOICES)];
    next[idx] = { ...next[idx], text };
    update("choices", next);
  }

  function setAcceptedAnswer(idx: number, text: string) {
    const next = [...(values.acceptedAnswers ?? [""])];
    next[idx] = text;
    update("acceptedAnswers", next);
  }

  function addAcceptedAnswer() {
    update("acceptedAnswers", [...(values.acceptedAnswers ?? []), ""]);
  }

  function removeAcceptedAnswer(idx: number) {
    const next = (values.acceptedAnswers ?? []).filter((_, i) => i !== idx);
    update("acceptedAnswers", next.length ? next : [""]);
  }

  const previewQuestion = useMemo(
    () => ({
      type: values.type,
      passage: values.passage,
      stem: values.stem,
      imageUrl: values.imageUrl || null,
      imagePosition: values.imagePosition,
      imageMaxWidth: values.imageMaxWidth ?? null,
      choices: values.type === "MULTIPLE_CHOICE" ? values.choices : null,
      correctAnswer: values.correctAnswer,
      acceptedAnswers:
        values.type === "STUDENT_PRODUCED_RESPONSE"
          ? (values.acceptedAnswers ?? []).filter(Boolean)
          : null,
      explanation: values.explanation,
    }),
    [values],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      sectionType: values.sectionType,
      type: values.type,
      domain: values.domain.trim(),
      skill: values.skill.trim() || null,
      difficulty: values.difficulty,
      passage: values.passage.trim() || null,
      stem: values.stem,
      imageUrl: values.imageUrl.trim() || null,
      imagePosition: values.imagePosition,
      imageMaxWidth: values.imageMaxWidth ?? null,
      choices: values.type === "MULTIPLE_CHOICE" ? values.choices : null,
      correctAnswer:
        values.type === "MULTIPLE_CHOICE"
          ? values.correctAnswer
          : (values.acceptedAnswers ?? [""])[0]?.trim() || "",
      acceptedAnswers:
        values.type === "STUDENT_PRODUCED_RESPONSE"
          ? (values.acceptedAnswers ?? []).map((a) => a.trim()).filter(Boolean)
          : null,
      explanation: values.explanation.trim() || null,
    };

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createQuestion(payload)
          : await updateQuestion(questionId!, payload);

      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (mode === "create") {
        router.push(`/admin/questions/${res.id}`);
      } else {
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!questionId) return;
    setDeleteOpen(true);
  }

  return (
    <>
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* ------------ Editor ------------ */}
      <div className="space-y-5">
        <Field label="Section">
          <div className="inline-flex rounded-lg border border-input bg-card p-1 text-sm">
            <SectionPill
              active={values.sectionType === "READING_WRITING"}
              onClick={() => update("sectionType", "READING_WRITING")}
              label="English (R&W)"
            />
            <SectionPill
              active={values.sectionType === "MATH"}
              onClick={() => update("sectionType", "MATH")}
              label="Math"
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Question type">
            <select
              value={values.type}
              onChange={(e) => update("type", e.target.value as Type)}
              className={inputClass}
            >
              <option value="MULTIPLE_CHOICE">Multiple choice</option>
              <option value="STUDENT_PRODUCED_RESPONSE">Student-produced response</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select
              value={values.difficulty}
              onChange={(e) => update("difficulty", e.target.value as Difficulty)}
              className={inputClass}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="MIXED">Mixed</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Domain">
            <input
              value={values.domain}
              onChange={(e) => update("domain", e.target.value)}
              className={inputClass}
              placeholder="e.g. Algebra"
              required
            />
          </Field>
          <Field label="Skill (optional)">
            <input
              value={values.skill}
              onChange={(e) => update("skill", e.target.value)}
              className={inputClass}
              placeholder="e.g. Linear equations"
            />
          </Field>
        </div>

        <Field
          label="Passage (HTML + LaTeX, optional)"
          hint="Use $...$ for inline math, $$...$$ for display."
        >
          <textarea
            value={values.passage}
            onChange={(e) => update("passage", e.target.value)}
            className={`${inputClass} min-h-[110px] font-mono text-xs`}
            placeholder="<p>Passage text…</p>"
          />
        </Field>

        <Field
          label="Question stem (HTML + LaTeX)"
          hint="The main question text. Required."
        >
          <textarea
            value={values.stem}
            onChange={(e) => update("stem", e.target.value)}
            className={`${inputClass} min-h-[110px] font-mono text-xs`}
            placeholder="<p>If $3x + 5 = 17$, what is $x$?</p>"
            required
          />
        </Field>

        <Field label="Image (optional)">
          <ImageUploader
            value={values.imageUrl || null}
            onChange={(url) => update("imageUrl", url ?? "")}
          />
        </Field>

        {values.imageUrl && (
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Image display
            </div>
            <Field label="Position">
              <div className="inline-flex rounded-lg border border-input bg-background p-1 text-sm">
                <SectionPill
                  active={values.imagePosition === "TOP"}
                  onClick={() => update("imagePosition", "TOP")}
                  label="Above the stem"
                />
                <SectionPill
                  active={values.imagePosition === "INLINE"}
                  onClick={() => update("imagePosition", "INLINE")}
                  label="Between stem & choices"
                />
              </div>
            </Field>
            <Field
              label="Max width"
              hint="Leave blank for natural size. Range: 50–2000 px."
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={50}
                  max={1200}
                  step={10}
                  value={values.imageMaxWidth ?? 600}
                  onChange={(e) => update("imageMaxWidth", Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min={50}
                  max={2000}
                  step={10}
                  value={values.imageMaxWidth ?? ""}
                  onChange={(e) => {
                    const n = e.target.value === "" ? null : Number(e.target.value);
                    update("imageMaxWidth", Number.isFinite(n as number) ? (n as number) : null);
                  }}
                  placeholder="auto"
                  className="w-24 rounded-md border border-input bg-background px-2 py-1 text-right text-sm"
                />
                <span className="text-xs text-muted-foreground">px</span>
                <button
                  type="button"
                  onClick={() => update("imageMaxWidth", null)}
                  className="rounded border border-input px-2 py-1 text-xs hover:bg-accent"
                >
                  Auto
                </button>
              </div>
            </Field>
          </div>
        )}

        {values.type === "MULTIPLE_CHOICE" ? (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Choices</legend>
            {(values.choices ?? EMPTY_CHOICES).map((c, i) => (
              <div key={c.label} className="flex items-start gap-2">
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="correct"
                    checked={values.correctAnswer === c.label}
                    onChange={() => update("correctAnswer", c.label)}
                  />
                  <span className="font-semibold">{c.label}</span>
                </label>
                <textarea
                  value={c.text}
                  onChange={(e) => setChoice(i, e.target.value)}
                  className={`${inputClass} min-h-[44px] font-mono text-xs`}
                  placeholder={`Choice ${c.label} text (HTML/LaTeX OK)`}
                  required
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Click the radio to mark the correct choice.
            </p>
          </fieldset>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Accepted answers</legend>
            <p className="text-xs text-muted-foreground">
              Provide every equivalent form (e.g. <code>0.5</code>, <code>1/2</code>,{" "}
              <code>.5</code>). First entry is shown as the canonical answer.
            </p>
            {(values.acceptedAnswers ?? [""]).map((a, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={a}
                  onChange={(e) => setAcceptedAnswer(i, e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 4"
                  required={i === 0}
                />
                <button
                  type="button"
                  onClick={() => removeAcceptedAnswer(i)}
                  className="rounded-md border border-input px-2 text-xs hover:bg-accent"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAcceptedAnswer}
              className="rounded-md border border-input px-3 py-1 text-xs hover:bg-accent"
            >
              + Add accepted form
            </button>
          </fieldset>
        )}

        <Field label="Explanation (optional)">
          <textarea
            value={values.explanation}
            onChange={(e) => update("explanation", e.target.value)}
            className={`${inputClass} min-h-[90px] font-mono text-xs`}
            placeholder="<p>Subtract 5, then divide by 3.</p>"
          />
        </Field>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : mode === "create" ? "Create question" : "Save changes"}
          </button>
          {mode === "edit" && questionId && (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ------------ Live preview ------------ */}
      <div className="space-y-2 lg:sticky lg:top-6 lg:self-start">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live preview (student view)
        </div>
        <QuestionPreview question={previewQuestion} showAnswer />
      </div>
    </form>

    <DeleteQuestionModal
      open={deleteOpen}
      questionId={questionId ?? null}
      initialAssignments={assignments}
      onClose={() => setDeleteOpen(false)}
    />
    </>
  );
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function SectionPill({
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
      className={
        "rounded-md px-3 py-1.5 text-sm transition " +
        (active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent")
      }
    >
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
