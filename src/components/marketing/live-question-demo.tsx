import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { readRenderedQuestion } from "@/lib/rendered-question";
import {
  DEMO_QUESTIONS_TAG,
  DEMO_QUESTION_COUNT,
  type DemoQuestion,
} from "@/lib/demo-question";
import { LiveQuestionDemoClient } from "./live-question-demo-client";

/**
 * The landing page's playable demo (T3.3).
 *
 * Recon W3: `/practice` already gives a logged-out visitor a full, real,
 * timed test bound to their browser by an HMAC cookie. So this is not the
 * unauthenticated path — it is the *entry point* to it, and it hands off to
 * `/practice` rather than competing with it. Three questions, no attempt row,
 * no cookie, nothing migrated on signup.
 *
 * This file is the server half: it runs the query and turns each question into
 * the strictly-less-than-everything shape the browser is allowed to see. The
 * key and the explanation stay here — `/api/demo/answer` releases them once a
 * visitor has committed to a choice.
 */

/**
 * `readRenderedQuestion` imports KaTeX, so this query cannot live in the client
 * island. Cached for the same reason the stats strip is: `/` is a dynamic route
 * (`LandingHeader` calls `auth()`), so a segment `revalidate` would do nothing,
 * and the demo must not put a database round-trip in front of the landing page
 * on every visit.
 */
const getDemoQuestions = unstable_cache(
  async (): Promise<DemoQuestion[]> => {
    const rows = await prisma.question.findMany({
      where: { publicDemo: true, type: "MULTIPLE_CHOICE" },
      // Stable and author-controlled: the tutor curates by choosing which three
      // to flag, and `createdAt` keeps them in the order they were authored.
      orderBy: { createdAt: "asc" },
      take: DEMO_QUESTION_COUNT,
      select: {
        id: true,
        sectionType: true,
        stem: true,
        passage: true,
        explanation: true,
        choices: true,
        renderedHtml: true,
      },
    });

    return rows.flatMap((row) => {
      const rendered = readRenderedQuestion(row);
      // A demo question with no choices is a mis-flagged SPR or a broken row.
      // Dropping it is better than rendering a stem with nothing to answer.
      if (!rendered.choices || rendered.choices.length === 0) return [];
      return [
        {
          id: row.id,
          sectionType: row.sectionType,
          stemHtml: rendered.stem,
          passageHtml: rendered.passage,
          choices: rendered.choices,
        } satisfies DemoQuestion,
      ];
    });
  },
  [DEMO_QUESTIONS_TAG],
  { revalidate: 3600, tags: [DEMO_QUESTIONS_TAG] },
);

export async function LiveQuestionDemo() {
  let questions: DemoQuestion[];
  try {
    questions = await getDemoQuestions();
  } catch (error) {
    // Same rule as the stats strip: `/` degrades to its static self rather than
    // 500ing because one section could not reach the database.
    console.error("[live-question-demo] query failed, hiding the section", error);
    return null;
  }

  // Nothing is flagged `publicDemo` by default — the flag is a licensing claim
  // only a person can make (open decision 4). Until someone makes it, the
  // section does not exist, which is the honest state and not an empty box.
  if (questions.length === 0) return null;

  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="border-y border-border/40 bg-paper-sunk"
    >
      <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-[52ch] text-center">
          <p className="eyebrow text-primary">Try it now</p>
          <h2 id="demo-heading" className="mt-3 text-h2">
            Answer {questions.length === 1 ? "a real question" : "real questions"} before you
            sign up
          </h2>
          <p className="mt-4 text-body-lg text-muted-foreground">
            The same answer choices, the same ABC eliminator, the same explanations students
            read after a full test. Nothing is saved and no account is needed.
          </p>
        </div>

        <div className="mt-10">
          <LiveQuestionDemoClient questions={questions} />
        </div>
      </div>
    </section>
  );
}
