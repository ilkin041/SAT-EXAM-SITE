/**
 * Decorative card showing a stylized "question" — pure CSS, no real data.
 * Sits at the right of the hero on large screens. Floats gently.
 */
export function MockTestCard() {
  return (
    <div className="relative mx-auto w-full max-w-md animate-float">
      {/* Multi-layer glow */}
      <div className="absolute -inset-8 -z-10 rounded-3xl bg-primary/[0.08] blur-2xl" aria-hidden />
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-violet-500/5 blur-xl" aria-hidden />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated-lg">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2 text-caption font-semibold text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
            Module 1 · Math
          </div>
          <div className="rounded-lg bg-foreground/5 px-2.5 py-1 text-eyebrow font-semibold tabular text-foreground">
            32:18
          </div>
        </div>

        {/* Question body */}
        <div className="p-6">
          <div className="eyebrow text-muted-foreground">
            Question 14 of 22
          </div>
          <p className="mt-3 text-body-lg text-foreground">
            If <span className="rounded bg-muted/50 px-1 font-mono text-caption">3x + 2 = 17</span>, what is the value of{" "}
            <span className="rounded bg-muted/50 px-1 font-mono text-caption">x</span>?
          </p>
          <div className="mt-5 space-y-2">
            {["A", "B", "C", "D"].map((letter, i) => (
              <div
                key={letter}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-body transition-all duration-200 ${
                  i === 1
                    ? "border-primary/50 bg-primary/5 text-foreground shadow-sm"
                    : "border-border/60 text-muted-foreground hover:border-border"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-caption tabular font-bold ${
                    i === 1
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/60"
                  }`}
                >
                  {letter}
                </span>
                <span>{["3", "5", "7", "15"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
          <button
            type="button"
            disabled
            className="rounded-lg border border-input bg-card px-3.5 py-1.5 text-caption font-semibold text-muted-foreground shadow-sm"
          >
            Back
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg bg-primary px-3.5 py-1.5 text-caption font-semibold text-primary-foreground shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
