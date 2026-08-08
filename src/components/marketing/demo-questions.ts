import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { readRenderedQuestion } from "@/lib/rendered-question";
import {
  DEMO_QUESTIONS_TAG,
  DEMO_QUESTION_COUNT,
  type DemoQuestion,
} from "@/lib/demo-question";

/**
 * The server half of the landing demo (T3.3), split out of the section
 * component in T3.4 when the demo became the hero's signature element rather
 * than a section of its own.
 *
 * It loads the three questions and turns each into the strictly-less-than-
 * everything shape the browser is allowed to see. The key and the explanation
 * stay here — `/api/demo/answer` releases them once a visitor has committed to
 * a choice.
 *
 * This module is server-only: `readRenderedQuestion` imports KaTeX and `prisma`
 * needs no introduction. Same rule as `rendered-question.ts`.
 */

/**
 * Cached for the same reason the stats strip is: `/` is a dynamic route
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

/**
 * Never throws and never guesses. An empty array means "there is no demo",
 * which the hero renders as *nothing* — not an empty box and not a placeholder.
 *
 * Two ways to get there, and both are honest: nothing is flagged `publicDemo`
 * (the default, because the flag is a licensing claim only a person can make —
 * open decision 4), or the database is unreachable. `/` is otherwise the one
 * page that survives an outage, and the try/catch keeps that true.
 */
export async function loadDemoQuestions(): Promise<DemoQuestion[]> {
  try {
    return await getDemoQuestions();
  } catch (error) {
    console.error("[demo-questions] query failed, hiding the demo", error);
    return [];
  }
}
