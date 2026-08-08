import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAnswerCorrect } from "@/lib/answer-matching";
import { checkRateLimit } from "@/lib/rate-limit";
import { readRenderedQuestion } from "@/lib/rendered-question";
import { DEMO_CHOICE_LABELS, type DemoChoiceLabel, type DemoVerdict } from "@/lib/demo-question";

/**
 * Grades one landing-demo answer (T3.3).
 *
 * The key and the explanation are **not** in the page payload. Server-rendering
 * them alongside the stem would put `correctAnswer` in the HTML of the app's
 * most-crawled page, where "view source" is the whole demo. So the shell ships
 * stems and choices, and this endpoint hands back the verdict once a visitor
 * has actually committed to a choice.
 *
 * It writes nothing. No attempt, no answer row, no analytics — a demo is not an
 * attempt, and `AttemptQuestionSnapshot` exists precisely so that real grading
 * never reads a live question. This one does read live, which is safe only
 * because there is no score it can retroactively change.
 */

/**
 * Generous enough that a visitor answering three questions and re-reading them
 * never sees it, tight enough that the endpoint is not a free key oracle for
 * the demo questions. Per instance, per IP — same limiter the rest of the app
 * uses; see `lib/rate-limit.ts` for what that does not survive (a fleet).
 */
const RATE_LIMIT = { limit: 30, windowMs: 60_000 };

export async function POST(request: Request) {
  const limit = checkRateLimit(request, "demo-answer", RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many answers from this address. Wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const { questionId, response } = (body ?? {}) as {
    questionId?: unknown;
    response?: unknown;
  };
  if (typeof questionId !== "string" || !questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }
  if (
    typeof response !== "string" ||
    !DEMO_CHOICE_LABELS.includes(response as DemoChoiceLabel)
  ) {
    return NextResponse.json({ error: "response must be A, B, C, or D." }, { status: 400 });
  }

  // `publicDemo` is in the `where`, not checked after the read. Without it this
  // is a public endpoint that returns the answer key for any question id in the
  // bank, which is the one way this route could hurt the product.
  const question = await prisma.question.findFirst({
    where: { id: questionId, publicDemo: true, type: "MULTIPLE_CHOICE" },
    select: {
      type: true,
      correctAnswer: true,
      acceptedAnswers: true,
      stem: true,
      passage: true,
      explanation: true,
      choices: true,
      renderedHtml: true,
    },
  });
  if (!question) {
    return NextResponse.json({ error: "That question is not in the demo." }, { status: 404 });
  }

  const verdict: DemoVerdict = {
    correct: isAnswerCorrect(
      {
        type: question.type,
        correctAnswer: question.correctAnswer,
        acceptedAnswers: question.acceptedAnswers,
      },
      response,
    ),
    correctAnswer: question.correctAnswer as DemoChoiceLabel,
    explanationHtml: readRenderedQuestion(question).explanation,
  };

  return NextResponse.json(verdict, {
    // The verdict is a pure function of a question that changes at authoring
    // time, but caching it at the edge would key on the URL and not the body.
    headers: { "Cache-Control": "no-store" },
  });
}
