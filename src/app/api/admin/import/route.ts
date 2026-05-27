import { NextResponse } from "next/server";
import { Prisma, SectionType, Difficulty, QuestionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  importSchema,
  bankImportSchema,
  flattenIssues,
  type ImportPayload,
  type BankImportPayload,
} from "@/lib/import-schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Mode dispatch: `import: "questions"` → bank import; `test: {...}` → full test.
  const top = body as Record<string, unknown> | null;
  if (top && top.import === "questions") {
    return handleBankImport(body, dryRun);
  }
  if (top && "test" in top) {
    return handleFullImport(body, dryRun, session.user.id);
  }

  return NextResponse.json(
    {
      ok: false,
      errors: [
        '(root): unrecognized payload — expected `"import": "questions"` (bank import) or a `"test"` field (full-test import).',
      ],
    },
    { status: 400 },
  );
}

// ---------------- Full-test import (unchanged from before) ----------------

async function handleFullImport(body: unknown, dryRun: boolean, adminId: string) {
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, mode: "test", errors: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }
  const summary = buildSummary(parsed.data);
  if (dryRun) {
    return NextResponse.json({ ok: true, mode: "test", dryRun: true, summary });
  }
  const created = await commit(parsed.data, adminId);
  return NextResponse.json({
    ok: true,
    mode: "test",
    dryRun: false,
    summary,
    testId: created.id,
  });
}

// ---------------- Bank-only import ----------------

async function handleBankImport(body: unknown, dryRun: boolean) {
  const parsed = bankImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, mode: "bank", errors: flattenIssues(parsed.error) },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const preview = data.questions.map((q) => ({
    type: q.type,
    domain: q.domain,
    skill: q.skill ?? null,
    difficulty: q.difficulty,
    stemPreview: stripHtml(q.stem).slice(0, 160),
  }));

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      mode: "bank",
      dryRun: true,
      count: data.questions.length,
      questions: preview,
    });
  }

  await commitBank(data);
  return NextResponse.json({
    ok: true,
    mode: "bank",
    dryRun: false,
    count: data.questions.length,
  });
}

async function commitBank(payload: BankImportPayload) {
  // Single transaction — partial failure leaves nothing behind.
  await prisma.$transaction(async (tx) => {
    for (const q of payload.questions) {
      await tx.question.create({
        data: {
          sectionType: SectionType[q.sectionType!],
          type: QuestionType[q.type],
          domain: q.domain,
          skill: q.skill ?? null,
          difficulty: Difficulty[q.difficulty],
          passage: q.passage ?? null,
          stem: q.stem,
          imageUrl: q.imageUrl && q.imageUrl.length > 0 ? q.imageUrl : null,
          imagePosition: q.imagePosition === "TOP" ? "TOP" : "INLINE",
          imageMaxWidth: q.imageMaxWidth ?? null,
          choices: q.choices
            ? (q.choices as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
          correctAnswer: q.correctAnswer,
          acceptedAnswers: q.acceptedAnswers
            ? (q.acceptedAnswers as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
          explanation: q.explanation ?? null,
        },
      });
    }
  });
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function buildSummary(payload: ImportPayload) {
  const sections = payload.sections.map((s) => ({
    type: s.type,
    order: s.order,
    module1TimeLimit: s.module1TimeLimit,
    module2TimeLimit: s.module2TimeLimit,
    modules: s.modules.map((m) => ({
      moduleNumber: m.moduleNumber,
      difficulty: m.difficulty,
      questionCount: m.questions.length,
    })),
  }));

  const totalQuestions = payload.sections
    .flatMap((s) => s.modules)
    .reduce((acc, m) => acc + m.questions.length, 0);

  return {
    test: {
      title: payload.test.title,
      mode: payload.test.mode,
      isPublic: payload.test.isPublic ?? false,
      adaptiveThreshold: payload.test.adaptiveThreshold ?? 0.6,
    },
    totalQuestions,
    sections,
  };
}

async function commit(payload: ImportPayload, adminId: string) {
  // Wrap the whole import in a transaction so a partial failure leaves no
  // half-built test behind.
  return prisma.$transaction(async (tx) => {
    const test = await tx.test.create({
      data: {
        title: payload.test.title,
        description: payload.test.description ?? null,
        mode: payload.test.mode,
        isPublic: payload.test.isPublic ?? false,
        adaptiveThreshold: payload.test.adaptiveThreshold ?? 0.6,
        createdById: adminId,
      },
    });

    for (const section of payload.sections) {
      const createdSection = await tx.section.create({
        data: {
          testId: test.id,
          type: SectionType[section.type],
          order: section.order,
          module1TimeLimit: section.module1TimeLimit,
          module2TimeLimit: section.module2TimeLimit,
        },
      });

      for (const mod of section.modules) {
        const createdModule = await tx.module.create({
          data: {
            sectionId: createdSection.id,
            moduleNumber: mod.moduleNumber,
            difficulty: Difficulty[mod.difficulty],
          },
        });

        for (let i = 0; i < mod.questions.length; i++) {
          const q = mod.questions[i];
          // 1) Create the bank question (no module link yet).
          const createdQuestion = await tx.question.create({
            data: {
              // Inherits from the section it's placed in — overridable by an
              // explicit per-question value, but normally just the section type.
              sectionType:
                q.sectionType
                  ? SectionType[q.sectionType]
                  : SectionType[section.type],
              type: QuestionType[q.type],
              domain: q.domain,
              skill: q.skill ?? null,
              difficulty: Difficulty[q.difficulty],
              passage: q.passage ?? null,
              stem: q.stem,
              imageUrl: q.imageUrl && q.imageUrl.length > 0 ? q.imageUrl : null,
              imagePosition: q.imagePosition === "TOP" ? "TOP" : "INLINE",
              imageMaxWidth: q.imageMaxWidth ?? null,
              choices: q.choices
                ? (q.choices as unknown as Prisma.InputJsonValue)
                : Prisma.DbNull,
              correctAnswer: q.correctAnswer,
              acceptedAnswers: q.acceptedAnswers
                ? (q.acceptedAnswers as unknown as Prisma.InputJsonValue)
                : Prisma.DbNull,
              explanation: q.explanation ?? null,
            },
          });
          // 2) Link it into this module at the right order.
          await tx.moduleQuestion.create({
            data: {
              moduleId: createdModule.id,
              questionId: createdQuestion.id,
              order: i + 1,
            },
          });
        }
      }
    }

    return test;
  });
}
