import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage, ArticleSection } from "@/components/marketing/article-page";
import { TAXONOMY } from "@/lib/question-taxonomy";
import { pageMetadata } from "@/lib/site";

/**
 * `/sat-format` — a guide to the Digital SAT (T3.8).
 *
 * This is the one page on the site written to be worth reading whether or not
 * anybody signs up. It describes the exam, not the product; the product appears
 * at the end of a section, once, where it is genuinely the next step.
 *
 * **The domain names come from `TAXONOMY`, not from prose.** They are the same
 * eight the question bank tags against, so a reader who takes a test here sees
 * on the score report the words they read on this page. If the taxonomy is ever
 * corrected, this page is corrected with it.
 *
 * **The numbers are the College Board's published specification for the digital
 * test, and this page says so.** Section and module lengths, timings and
 * approximate domain weights are theirs; the College Board is the authority and
 * this page is a description of what they publish, which is why it carries no
 * claim to be current beyond that. Everything about how *this platform* behaves
 * is on `/scoring`, where it is derived from the code rather than described.
 */

export const metadata: Metadata = pageMetadata({
  title: "The Digital SAT format",
  description:
    "How the Digital SAT is built: two sections, two modules each, 98 questions in 2 hours 14 minutes, section-adaptive routing, the content domains in each section, and the tools on screen.",
  path: "/sat-format",
  og: { title: "The Digital SAT, section by section", eyebrow: "Guide" },
});

/** Section structure. One row per section, plus the totals row. */
const STRUCTURE = [
  {
    section: "Reading and Writing",
    modules: "2 modules",
    questions: 54,
    minutes: 64,
    perModule: "27 questions, 32 minutes each",
  },
  {
    section: "Math",
    modules: "2 modules",
    questions: 44,
    minutes: 70,
    perModule: "22 questions, 35 minutes each",
  },
] as const;

const TOTAL_QUESTIONS = STRUCTURE.reduce((sum, row) => sum + row.questions, 0);
const TOTAL_MINUTES = STRUCTURE.reduce((sum, row) => sum + row.minutes, 0);
const BREAK_MINUTES = 10;

/** Approximate share of a section, as the College Board publishes it. */
const DOMAIN_WEIGHTS: Record<string, string> = {
  "info-ideas": "about 26%",
  "craft-structure": "about 28%",
  "expression-ideas": "about 20%",
  "standard-english": "about 26%",
  algebra: "about 35%",
  "advanced-math": "about 35%",
  "problem-solving-data-analysis": "about 15%",
  "geometry-trigonometry": "about 15%",
};

const READING_DOMAINS = TAXONOMY.filter((d) => d.sectionType === "READING_WRITING");
const MATH_DOMAINS = TAXONOMY.filter((d) => d.sectionType === "MATH");

export default function SatFormatPage() {
  return (
    <ArticlePage
      eyebrow="Guide"
      title="The Digital SAT, section by section"
      lede={
        <>
          The SAT has been a digital, section-adaptive test since 2024. It is shorter than
          the paper exam it replaced, the questions are self-contained, and the second half
          of each section depends on how you did in the first. Here is the whole structure.
        </>
      }
    >
      <ArticleSection title="The shape of the test">
        <p>
          Two sections, in a fixed order: Reading and Writing first, then Math. Each is split
          into two modules that are timed separately, and you cannot go back to a module once
          its time is up. Within a module you can move freely between questions, mark any of
          them for review, and change an answer.
        </p>
      </ArticleSection>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse">
          <caption className="sr-only">
            Digital SAT structure: sections, modules, question counts and timings
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="pb-2 text-left eyebrow text-muted-foreground">
                Section
              </th>
              <th scope="col" className="pb-2 text-right eyebrow text-muted-foreground">
                Questions
              </th>
              <th scope="col" className="pb-2 text-right eyebrow text-muted-foreground">
                Minutes
              </th>
              <th scope="col" className="pb-2 text-right eyebrow text-muted-foreground">
                Per module
              </th>
            </tr>
          </thead>
          <tbody>
            {STRUCTURE.map((row) => (
              <tr key={row.section} className="border-b border-border/50">
                <td className="py-3 text-body font-medium text-ink">{row.section}</td>
                <td className="py-3 text-right text-body tabular text-muted-foreground">
                  {row.questions}
                </td>
                <td className="py-3 text-right text-body tabular text-muted-foreground">
                  {row.minutes}
                </td>
                <td className="py-3 text-right text-body text-muted-foreground">
                  {row.perModule}
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-3 text-body font-semibold text-ink">Total</td>
              <td className="py-3 text-right text-body tabular font-semibold text-ink">
                {TOTAL_QUESTIONS}
              </td>
              <td className="py-3 text-right text-body tabular font-semibold text-ink">
                {TOTAL_MINUTES}
              </td>
              <td className="py-3 text-right text-body text-muted-foreground">
                plus a <span className="tabular">{BREAK_MINUTES}</span>-minute break
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-4 max-w-[62ch] text-body text-muted-foreground">
        <span className="tabular">{TOTAL_MINUTES}</span> minutes of testing is{" "}
        <span className="tabular">2</span> hours{" "}
        <span className="tabular">{TOTAL_MINUTES - 120}</span> minutes, with the break
        between the two sections. A handful of the questions you answer are unscored items
        being trialled for future tests, and there is no way to tell which — the only useful
        response to that is to treat every question as if it counts.
      </p>

      <ArticleSection id="adaptive" title="It adapts in the middle">
        <p>
          The test is <strong className="text-foreground">section-adaptive</strong>, not
          question-adaptive. Everybody sits the same Module 1 in a section, and how you do on
          it decides which Module 2 you get: a harder set or an easier one. It is a single
          decision per section, made once, on your performance across the whole first module.
        </p>
        <p>
          This is the part that surprises people. The easier Module 2 does not lead to the
          top of the scale — the score range reachable through it is limited, which is what
          makes Module 1 the half of each section that decides most of your score. A question
          you rush in Module 1 costs you more than the same question in Module 2.
        </p>
        <p>
          Nothing on screen tells you which module you were given. The two look identical and
          the routing is invisible while you are sitting it.
        </p>
      </ArticleSection>

      <ArticleSection id="reading-writing" title="Reading and Writing">
        <p>
          Every question is self-contained: one short passage of roughly 25 to 150 words,
          then one question about it. There are no long passages with a set of questions
          hanging off them, which is the largest single change from the paper SAT. Passages
          run across literature, history, social science and the sciences, and some come with
          a table or a graph you have to read.
        </p>
        <p>
          Questions are grouped by content domain and, inside each group, run roughly from
          easier to harder. So difficulty resets a few times as you work through a module,
          and a sudden jump usually means a new domain has started rather than that you are
          struggling.
        </p>
        <DomainList domains={READING_DOMAINS} />
      </ArticleSection>

      <ArticleSection id="math" title="Math">
        <p>
          About three quarters of the Math questions are multiple choice with four options.
          The rest are <strong className="text-foreground">student-produced responses</strong>
          : you type the answer instead of picking it, there are no options to eliminate, and
          a question can have more than one acceptable answer. Fractions and decimals are
          both accepted, and a negative answer is possible on some.
        </p>
        <p>
          A calculator is allowed on the whole section — the Desmos graphing calculator is
          built into the test app, so there is nothing to bring, and the reference sheet of
          geometry formulas is available on every question. Both are worth practising with
          rather than discovering on the day: the graphing calculator solves several question
          types outright if you know how to set them up.
        </p>
        <DomainList domains={MATH_DOMAINS} />
      </ArticleSection>

      <ArticleSection id="tools" title="The tools on screen">
        <p>
          The test app gives you the same small set of controls throughout, and every one of
          them is worth being fluent with before test day:
        </p>
        <ul className="space-y-2">
          <Bullet>
            <strong className="text-foreground">Answer eliminator.</strong> Cross out options
            you have ruled out, so a second pass does not re-read them.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">Mark for review.</strong> Flag a question and
            jump back to it from the question list, which shows what is answered and what is
            flagged.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">Highlighting and notes.</strong> Mark up a
            passage and attach a note to what you marked.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">The countdown timer</strong>, which you can
            hide. It reappears when the module is nearly over.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">The graphing calculator and the reference
            sheet</strong>, in the Math section.
          </Bullet>
        </ul>
        <p>
          The interface here reproduces all of these, because knowing where they are is
          itself a few points: nobody wants to be learning what the eliminator is called
          while a clock runs.
        </p>
      </ArticleSection>

      <ArticleSection id="scores" title="How it is scored">
        <p>
          Each section gives a score from <span className="tabular">200</span> to{" "}
          <span className="tabular">800</span>, and the two add up to a total from{" "}
          <span className="tabular">400</span> to <span className="tabular">1600</span>. Raw
          counts are converted through a table, and there is no penalty for a wrong answer —
          which means there is never a reason to leave a question blank.
        </p>
        <p>
          Official scores come back in a matter of days rather than weeks, and you choose
          which colleges receive them.{" "}
          <Link
            href="/scoring"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            The scoring this platform uses
          </Link>{" "}
          is documented in full, including its conversion tables, so you can see exactly how
          a practice number was produced.
        </p>
      </ArticleSection>

      <ArticleSection title="Practising the format">
        <p>
          Most of what makes the digital test feel different is structural rather than
          academic: the modules are timed separately, the routing decision is invisible, the
          Reading and Writing questions come one passage at a time, and the tools are on
          screen instead of in your hand. Those are all things you can get used to in
          advance, and a practice test you sit under the real timing is worth several you
          work through at your own pace.
        </p>
        <p>
          <Link
            href="/practice"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sit a timed practice test
          </Link>{" "}
          in this format, without an account, or read the{" "}
          <Link
            href="/faq"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            frequently asked questions
          </Link>
          .
        </p>
      </ArticleSection>

      <p className="mt-12 border-t border-border/40 pt-8 text-caption text-muted-foreground">
        The structure, timings and domain weights above are the College Board&rsquo;s
        published specification for the digital test; the College Board is the authority on
        them and can change them. This site is not affiliated with, endorsed by or connected
        to the College Board, and SAT is their trademark.
      </p>
    </ArticlePage>
  );
}

/** The domains of one section, with the share of it each accounts for. */
function DomainList({
  domains,
}: {
  domains: readonly { id: string; name: string; skills: readonly { id: string; name: string }[] }[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {domains.map((domain) => (
        <div
          key={domain.id}
          className="rounded-xl border border-border/60 bg-card p-4 shadow-card"
        >
          <dt className="flex items-baseline justify-between gap-3">
            <span className="text-body font-semibold text-ink">{domain.name}</span>
            <span className="shrink-0 text-caption tabular text-muted-foreground">
              {DOMAIN_WEIGHTS[domain.id]}
            </span>
          </dt>
          <dd className="mt-1.5 text-caption text-muted-foreground">
            {domain.skills.map((skill) => skill.name).join(" · ")}
          </dd>
        </div>
      ))}
    </dl>
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
