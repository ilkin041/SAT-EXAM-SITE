import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ArticlePage, ArticleSection } from "@/components/marketing/article-page";
import {
  DEFAULT_MATH_TABLE,
  DEFAULT_RW_TABLE,
  EASY_ROUTE_CAP,
  FULL_LENGTH_MATH_QUESTIONS,
  FULL_LENGTH_RW_QUESTIONS,
  SCALED_MAX,
  SCALED_MIN,
} from "@/lib/scoring";
import {
  FIDELITY_FACTS,
  MATH_CONVERSION_SAMPLE,
  MATH_MAX_RAW,
  MATH_TABLE_ENTRIES,
  RW_CONVERSION_SAMPLE,
  RW_MAX_RAW,
  RW_TABLE_ENTRIES,
  SHORT_TEST_EXAMPLE,
  TOTAL_MAX,
  TOTAL_MIN,
} from "@/lib/scoring-facts";
import { pageMetadata } from "@/lib/site";

/**
 * `/scoring` — `docs/scoring-policy.md` for students (T3.8).
 *
 * That document was good and invisible: it lived in the repo, so the only people
 * who could read the rules were the people who wrote them. This is the same
 * policy, in the reader's terms, with the parts the doc leaves implicit spelled
 * out — chiefly what an `INCOMPLETE` attempt actually shows.
 *
 * **Every number on this page comes out of `src/lib/scoring.ts`.** The tables
 * are rendered from `DEFAULT_RW_TABLE` / `DEFAULT_MATH_TABLE`, the cap is
 * `EASY_ROUTE_CAP`, the full-length counts are the two constants, and the worked
 * example is the return value of `scaleScore` — see `src/lib/scoring-facts.ts`.
 * Nothing is transcribed, so the acceptance criterion ("`/scoring` matches what
 * `scoring.ts` actually does") cannot rot the way a hand-typed page would.
 *
 * The full tables are behind `<details>` for the same reason the FAQ is: a
 * closed disclosure keeps its content in the markup, costs no client JavaScript
 * and works before hydration, so all hundred rows are in the page for a reader
 * who wants them and out of the way of one who does not.
 */

export const metadata: Metadata = pageMetadata({
  title: "How scoring works",
  description:
    "The conversion tables this platform uses to turn raw counts into a 200–800 section score, how short tests are scaled, when the 600 cap applies, and what an incomplete attempt shows.",
  path: "/scoring",
  og: { title: "How your score is worked out", eyebrow: "Scoring" },
});

export default function ScoringPage() {
  return (
    <ArticlePage
      eyebrow="Scoring"
      title="How your score is worked out"
      lede={
        <>
          Every number in your score report comes from one published rule, applied the same
          way to every attempt. This page is that rule, including the two lookup tables it
          reads. Nothing here is an official SAT score.
        </>
      }
    >
      <ArticleSection title="The short version">
        <ul className="space-y-2">
          <Bullet>
            Your <strong className="text-foreground">raw score</strong> is how many questions
            you answered correctly in a section. Nothing is subtracted for a wrong answer.
          </Bullet>
          <Bullet>
            That raw score is looked up in a fixed conversion table and comes out as a{" "}
            <strong className="text-foreground">
              <span className="tabular">
                {SCALED_MIN}&ndash;{SCALED_MAX}
              </span>{" "}
              scaled score
            </strong>{" "}
            for the section.
          </Bullet>
          <Bullet>
            The two section scores are added together for a total between{" "}
            <span className="tabular">{TOTAL_MIN}</span> and{" "}
            <span className="tabular">{TOTAL_MAX}</span>.
          </Bullet>
          <Bullet>
            If a section routed you to the easier second module, that section is capped at{" "}
            <span className="tabular">{EASY_ROUTE_CAP}</span> afterwards.
          </Bullet>
          <Bullet>
            A total needs both sections. With one section unscored, no total is shown at all.
          </Bullet>
        </ul>
      </ArticleSection>

      <ArticleSection id="tables" title="The conversion tables">
        <p>
          There is one table per section and every test uses it. Reading and Writing has{" "}
          <span className="tabular">{RW_TABLE_ENTRIES}</span> entries, one for each raw score
          from <span className="tabular">0</span> to{" "}
          <span className="tabular">{RW_MAX_RAW}</span>; Math has{" "}
          <span className="tabular">{MATH_TABLE_ENTRIES}</span>, covering{" "}
          <span className="tabular">0</span> to{" "}
          <span className="tabular">{MATH_MAX_RAW}</span>. The values are based on the
          released Digital SAT practice-test scoring guides.
        </p>
        <p>
          A test cannot carry its own table. There used to be a per-test column for one; it
          was never writable and never validated, so it was removed, and every attempt on
          this platform is now converted by one auditable policy.
        </p>
      </ArticleSection>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <TableCard
          heading="Reading and Writing"
          maxRaw={RW_MAX_RAW}
          sample={RW_CONVERSION_SAMPLE}
          full={DEFAULT_RW_TABLE}
        />
        <TableCard
          heading="Math"
          maxRaw={MATH_MAX_RAW}
          sample={MATH_CONVERSION_SAMPLE}
          full={DEFAULT_MATH_TABLE}
        />
      </div>

      <ArticleSection id="short-tests" title="Tests that are not full length">
        <p>
          Most practice here is shorter than a real exam — a single module, a section on its
          own, a set a tutor put together for one skill. The tables are indexed by a
          full-length raw score, so a short section is mapped onto the table in proportion
          before the lookup:
        </p>
        <p className="rounded-xl border border-border/60 bg-paper-sunk px-4 py-3 font-mono text-caption text-foreground">
          index = round(correct ÷ questions × (table length − 1))
        </p>
        <p>
          So a <span className="tabular">{SHORT_TEST_EXAMPLE.total}</span>-question Reading
          and Writing section with{" "}
          <span className="tabular">{SHORT_TEST_EXAMPLE.correct}</span> correct maps to row{" "}
          <span className="tabular">{SHORT_TEST_EXAMPLE.tableIndex}</span> of the table,
          which reads <span className="tabular">{SHORT_TEST_EXAMPLE.scaled}</span>.
        </p>
        <p>
          That is a real estimate and it is not the same thing as a full-length score. A
          section with ten questions has ten possible raw scores, so each question you get
          right or wrong moves the scaled number much further than it would on a{" "}
          <span className="tabular">{FULL_LENGTH_RW_QUESTIONS}</span>-question section. Your
          report says which kind of attempt it is rather than leaving you to work it out.
        </p>
      </ArticleSection>

      <ArticleSection id="adaptive" title="The adaptive lower route">
        <p>
          On an adaptive test, how you do on Module 1 decides which Module 2 you are served.
          If the module you actually got was the easier one, that section&rsquo;s score is
          capped at <span className="tabular">{EASY_ROUTE_CAP}</span>. The normal lookup runs
          first and the cap is applied to its result, so a section that would have converted
          below the cap is unaffected. A harder or mixed Module 2 is never capped.
        </p>
        <p>
          The <span className="tabular">{EASY_ROUTE_CAP}</span> is a deliberately
          conservative calibration by this platform, and it is not presented as a College
          Board curve, because the College Board does not publish a reusable conversion for
          the lower route. It is applied to the module you were served, not to the module the
          routing rule aimed at.
        </p>
      </ArticleSection>

      <ArticleSection id="fidelity" title="What your report shows">
        <p>
          Every completed attempt falls into one of three cases, and the report says which
          one it is:
        </p>
        <dl className="space-y-4">
          {FIDELITY_FACTS.map((fact) => (
            <div
              key={fact.id}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-card"
            >
              <dt className="text-h3 text-ink">{fact.label}</dt>
              <dd className="mt-2 text-body text-muted-foreground">
                <span className="font-medium text-foreground">When: </span>
                {fact.condition}
              </dd>
              <dd className="mt-1.5 text-body text-muted-foreground">
                <span className="font-medium text-foreground">You see: </span>
                {fact.shown}
              </dd>
            </div>
          ))}
        </dl>
        <p>
          &ldquo;Full length&rdquo; means exactly{" "}
          <span className="tabular">{FULL_LENGTH_RW_QUESTIONS}</span> Reading and Writing
          questions and exactly <span className="tabular">{FULL_LENGTH_MATH_QUESTIONS}</span>{" "}
          Math questions — the shape of the real exam. Anything else is an estimate, and an
          attempt missing a whole section is neither.
        </p>
        <p>
          An incomplete attempt is not a failure state and nothing is lost. Your answers, the
          per-question review and the explanations are all there; the only thing withheld is
          a total out of <span className="tabular">{TOTAL_MAX}</span>, because half a test
          cannot produce one and a number invented to fill the space would be worse than the
          gap.
        </p>
      </ArticleSection>

      <ArticleSection title="What this is not">
        <p>
          It is not an official score and it is not a prediction of one. The College
          Board&rsquo;s operational scoring model is not published, and this does not
          reproduce it. Nothing you do here is reported to any institution.
        </p>
        <p>
          There is no percentile and no comparison to other students. A percentile needs a
          representative distribution to sit in, this platform does not have one, and a
          number worked out from whoever happens to use the site would look exactly like a
          real percentile while meaning nothing.
        </p>
        <p>
          No score is stored. Only the raw counts per module are, and every scaled score you
          see is recomputed from them when the page is opened. That is a deliberate trade:
          it means a correction to a conversion table applies to your old attempts as well as
          your new ones, so your history stays internally comparable instead of being a
          mixture of two rules.
        </p>
      </ArticleSection>

      <p className="mt-12 border-t border-border/40 pt-8 text-body text-muted-foreground">
        Want to see it produce a number?{" "}
        <Link
          href="/practice"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Take a practice test
        </Link>{" "}
        without an account, or read the{" "}
        <Link
          href="/faq"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          frequently asked questions
        </Link>
        .
      </p>
    </ArticlePage>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/**
 * A sampled excerpt, with every row of the real table behind a `<details>`.
 *
 * The full list is in the markup either way — a closed `<details>` hides its
 * content, it does not omit it — so this costs the page nothing and gives a
 * reader who wants to check a specific raw score somewhere to check it.
 */
function TableCard({
  heading,
  maxRaw,
  sample,
  full,
}: {
  heading: string;
  maxRaw: number;
  sample: readonly { raw: number; scaled: number }[];
  full: readonly number[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
      <h3 className="text-h3 text-ink">{heading}</h3>
      <p className="mt-1 text-caption text-muted-foreground">
        Raw <span className="tabular">0</span>&ndash;
        <span className="tabular">{maxRaw}</span>
      </p>

      <ConversionTable
        caption={`${heading} — a sample of the conversion table`}
        rows={sample}
      />

      <details className="group mt-4 border-t border-border/50 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-caption font-semibold text-primary [&::-webkit-details-marker]:hidden">
          <span>
            Show all <span className="tabular">{full.length}</span> rows
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <ConversionTable
          caption={`${heading} — the complete conversion table`}
          rows={full.map((scaled, raw) => ({ raw, scaled }))}
        />
      </details>
    </div>
  );
}

function ConversionTable({
  caption,
  rows,
}: {
  caption: string;
  rows: readonly { raw: number; scaled: number }[];
}) {
  return (
    <table className="mt-4 w-full">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className="pb-2 text-left eyebrow text-muted-foreground">
            Raw score
          </th>
          <th scope="col" className="pb-2 text-right eyebrow text-muted-foreground">
            Scaled
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.raw} className="border-b border-border/50 last:border-b-0">
            <td className="py-1.5 text-body tabular text-muted-foreground">{row.raw}</td>
            <td className="py-1.5 text-right text-body tabular font-semibold text-ink">
              {row.scaled}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
