import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  MATH_CONVERSION_SAMPLE,
  MATH_MAX_RAW,
  RW_CONVERSION_SAMPLE,
  RW_MAX_RAW,
  TOTAL_MAX,
} from "@/lib/scoring-facts";
import { EASY_ROUTE_CAP, SCALED_MAX, SCALED_MIN } from "@/lib/scoring";

/**
 * "How the score is worked out" (T3.8) — `id="scoring"`.
 *
 * **The section is the proof, not a claim about it.** The prompt's note is the
 * design: there are no testimonials, no percentiles and no "students improve by
 * N points", because none of those exist and inventing one is the failure mode
 * this whole landing page has been built to avoid. What is left is the thing a
 * sceptical reader can actually check — the conversion table, printed on the
 * page, with the caveats next to it and a link to the full policy.
 *
 * **Both tables are rendered from `DEFAULT_RW_TABLE` and `DEFAULT_MATH_TABLE`.**
 * Not transcribed from them: `scoring-facts.ts` samples the arrays, so editing a
 * conversion table edits this section. That is what makes "matches what
 * `scoring.ts` does" a property rather than a promise.
 *
 * Zero client JavaScript, one flat surface, no gradient — `--gradient-primary`
 * is spoken for by the hero's demo rail and policy allows it once.
 */
export function ScoringBlock() {
  return (
    <section id="scoring" className="scroll-mt-16 border-y border-border/40 bg-paper-sunk">
      <div className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-primary">Scoring</p>
          <h2 className="mt-3 text-h2 text-ink">We show our work</h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-body-lg text-muted-foreground">
            Your raw score — how many you got right — becomes a{" "}
            <span className="tabular">
              {SCALED_MIN}&ndash;{SCALED_MAX}
            </span>{" "}
            score for each section through a fixed lookup table, and the two add up to a
            total out of <span className="tabular">{TOTAL_MAX}</span>. Here is the table.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <ConversionCard
            heading="Reading and Writing"
            maxRaw={RW_MAX_RAW}
            rows={RW_CONVERSION_SAMPLE}
          />
          <ConversionCard
            heading="Math"
            maxRaw={MATH_MAX_RAW}
            rows={MATH_CONVERSION_SAMPLE}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Caveat title="It is an estimate, not a score">
            The College Board does not publish its operational scoring model, and this does
            not reproduce it. Nothing here is reported to anyone, and no result from this
            site is an official SAT score.
          </Caveat>
          <Caveat title="A shorter test still converts">
            Your raw score is mapped onto the table in proportion, so a ten-question section
            lands somewhere sensible. It has fewer score points than a full-length one, and
            the report labels it as an estimate rather than hiding the difference.
          </Caveat>
          <Caveat title="The easier second module caps at 600">
            If a section routed you to the lower Module 2, that section is capped at{" "}
            <span className="tabular">{EASY_ROUTE_CAP}</span> after the lookup runs. That is
            a deliberately conservative calibration by this platform, not an official curve.
          </Caveat>
        </div>

        <p className="mt-10 text-center text-body text-muted-foreground">
          <Link
            href="/scoring"
            className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            Read the full scoring policy
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </p>
      </div>
    </section>
  );
}

/**
 * One section's excerpt. A `<caption>` rather than a heading above the table,
 * so the raw/scaled columns are announced with the section they belong to; the
 * numbers are `.tabular` because every number in this product is.
 */
function ConversionCard({
  heading,
  maxRaw,
  rows,
}: {
  heading: string;
  maxRaw: number;
  rows: readonly { raw: number; scaled: number }[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card md:p-7">
      <table className="w-full">
        <caption className="mb-4 text-left">
          <span className="text-h3 text-ink">{heading}</span>
          <span className="mt-1 block text-caption text-muted-foreground">
            <span className="tabular">
              {maxRaw + 1}
            </span>{" "}
            rows, one for every raw score from <span className="tabular">0</span> to{" "}
            <span className="tabular">{maxRaw}</span>. A sample of them:
          </span>
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="pb-2 text-left eyebrow text-muted-foreground">
              Raw
            </th>
            <th scope="col" className="pb-2 text-right eyebrow text-muted-foreground">
              Scaled
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.raw} className="border-b border-border/50 last:border-b-0">
              <td className="py-2 text-body tabular text-muted-foreground">{row.raw}</td>
              <td className="py-2 text-right text-body tabular font-semibold text-ink">
                {row.scaled}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Caveat({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
      <h3 className="text-h3 text-ink">{title}</h3>
      <p className="mt-2 text-body text-muted-foreground">{children}</p>
    </div>
  );
}
