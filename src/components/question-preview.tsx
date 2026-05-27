import { RichContent } from "./rich-content";
import { cn } from "@/lib/utils";

export type PreviewChoice = { label: "A" | "B" | "C" | "D"; text: string };

export interface PreviewQuestion {
  type: "MULTIPLE_CHOICE" | "STUDENT_PRODUCED_RESPONSE";
  passage?: string | null;
  stem: string;
  imageUrl?: string | null;
  imagePosition?: "TOP" | "INLINE" | null;
  imageMaxWidth?: number | null;
  choices?: PreviewChoice[] | null;
  correctAnswer?: string | null;
  acceptedAnswers?: string[] | null;
  explanation?: string | null;
}

interface Props {
  question: PreviewQuestion;
  /** When true, visually marks the correct choice and shows the explanation. */
  showAnswer?: boolean;
}

/**
 * A static, read-only render of a question — used in admin preview panes
 * and on the post-test review page. The live test interface uses its own
 * interactive component.
 */
export function QuestionPreview({ question, showAnswer = true }: Props) {
  const hasPassage = !!question.passage?.trim();

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={cn("grid gap-0", hasPassage ? "md:grid-cols-2" : "grid-cols-1")}>
        {hasPassage && (
          <div className="border-b border-border bg-muted/40 p-6 md:border-b-0 md:border-r">
            <RichContent html={question.passage} />
          </div>
        )}

        <div className="space-y-5 p-6">
          {question.imageUrl && (question.imagePosition ?? "INLINE") === "TOP" && (
            <PreviewImage
              src={question.imageUrl}
              maxWidthPx={question.imageMaxWidth ?? null}
            />
          )}

          <RichContent html={question.stem} />

          {question.imageUrl && (question.imagePosition ?? "INLINE") === "INLINE" && (
            <PreviewImage
              src={question.imageUrl}
              maxWidthPx={question.imageMaxWidth ?? null}
            />
          )}

          {question.type === "MULTIPLE_CHOICE" && question.choices && (
            <ul className="space-y-2">
              {question.choices.map((choice) => {
                const isCorrect = showAnswer && choice.label === question.correctAnswer;
                return (
                  <li
                    key={choice.label}
                    className={cn(
                      "flex items-start gap-3 rounded-md border px-4 py-3 text-sm transition",
                      isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        isCorrect
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-border bg-background",
                      )}
                    >
                      {choice.label}
                    </span>
                    <RichContent html={choice.text} className="flex-1" />
                  </li>
                );
              })}
            </ul>
          )}

          {question.type === "STUDENT_PRODUCED_RESPONSE" && (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Free-response: students enter a numeric value (e.g. <code>1/2</code>,{" "}
              <code>0.5</code>, <code>-3</code>).
              {showAnswer && question.correctAnswer && (
                <div className="mt-2 text-foreground">
                  <span className="font-medium">Correct: </span>
                  {question.correctAnswer}
                  {question.acceptedAnswers && question.acceptedAnswers.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      (also accepted: {question.acceptedAnswers.join(", ")})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {showAnswer && question.explanation && (
            <div className="rounded-md border border-border bg-muted/30 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Explanation
              </div>
              <RichContent html={question.explanation} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewImage({
  src,
  maxWidthPx,
}: {
  src: string;
  maxWidthPx: number | null;
}) {
  return (
    <figure className="flex justify-center overflow-hidden rounded-md border border-border bg-muted/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={maxWidthPx ? { maxWidth: `${maxWidthPx}px` } : undefined}
        className="block max-h-96 w-auto max-w-full object-contain"
      />
    </figure>
  );
}
