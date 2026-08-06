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
import {
  questionContentHash,
  selectQuestionImportIndices,
} from "@/lib/question-content-hash";

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
  const hashes = data.questions.map((q) => questionContentHash(q));
  const existing = await prisma.question.findMany({
    where: { contentHash: { in: hashes } },
    select: { id: true, contentHash: true, stem: true },
    orderBy: { createdAt: "asc" },
  });
  const existingByHash = new Map(existing.map((question) => [question.contentHash, question]));
  const firstImportIndex = new Map<string, number>();
  const preview = data.questions.map((q, index) => {
    const contentHash = hashes[index];
    const duplicateImportIndex = firstImportIndex.get(contentHash);
    if (duplicateImportIndex === undefined) firstImportIndex.set(contentHash, index);
    const duplicate = existingByHash.get(contentHash);
    return {
      index,
      type: q.type,
      domain: q.domain,
      skill: q.skill ?? null,
      difficulty: q.difficulty,
      stemPreview: stripHtml(q.stem).slice(0, 160),
      duplicate: duplicate
        ? { id: duplicate.id, stemPreview: stripHtml(duplicate.stem).slice(0, 160) }
        : null,
      duplicateImportIndex: duplicateImportIndex ?? null,
    };
  });

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      mode: "bank",
      dryRun: true,
      count: data.questions.length,
      questions: preview,
    });
  }

  const result = await commitBank(data);
  return NextResponse.json({
    ok: true,
    mode: "bank",
    dryRun: false,
    count: result.added,
    skipped: result.skipped,
  });
}

async function commitBank(payload: BankImportPayload) {
  return prisma.$transaction(async (tx) => {
    const hashes = payload.questions.map((question) => questionContentHash(question));
    const existing = await tx.question.findMany({
      where: { contentHash: { in: hashes } },
      select: { contentHash: true },
    });
    const selectedIndices = selectQuestionImportIndices({
      hashes,
      existingHashes: existing.flatMap((question) => question.contentHash ?? []),
      keepDuplicateIndices: payload.keepDuplicateIndices,
    });
    const rows = selectedIndices.map((index) =>
      questionCreateData(payload.questions[index], payload.questions[index].sectionType!, hashes[index]),
    );
    if (rows.length > 0) await tx.question.createMany({ data: rows });
    return { added: rows.length, skipped: payload.questions.length - rows.length };
  }, { timeout: 60_000 });
}

type ImportedQuestion =
  | BankImportPayload["questions"][number]
  | ImportPayload["sections"][number]["modules"][number]["questions"][number];

function questionCreateData(
  q: ImportedQuestion,
  sectionType: "READING_WRITING" | "MATH",
  contentHash = questionContentHash(q),
): Prisma.QuestionCreateManyInput {
  return {
    sectionType: SectionType[sectionType],
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
    contentHash,
  };
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

        const hashes = mod.questions.map((question) => questionContentHash(question));
        const existingQuestions = await tx.question.findMany({
          where: {
            contentHash: { in: hashes },
            sectionType: SectionType[section.type],
          },
          select: { id: true, contentHash: true },
        });
        const questionIdByHash = new Map(
          existingQuestions.flatMap((question) =>
            question.contentHash ? [[question.contentHash, question.id] as const] : [],
          ),
        );
        const missingByHash = new Map<string, Prisma.QuestionCreateManyInput>();
        mod.questions.forEach((question, index) => {
          const hash = hashes[index];
          if (!questionIdByHash.has(hash) && !missingByHash.has(hash)) {
            missingByHash.set(
              hash,
              questionCreateData(question, question.sectionType ?? section.type, hash),
            );
          }
        });
        if (missingByHash.size > 0) {
          const createdQuestions = await tx.question.createManyAndReturn({
            data: [...missingByHash.values()],
            select: { id: true, contentHash: true },
          });
          for (const question of createdQuestions) {
            if (question.contentHash) questionIdByHash.set(question.contentHash, question.id);
          }
        }
        const linksByHash = new Map<string, Prisma.ModuleQuestionCreateManyInput>();
        mod.questions.forEach((_question, index) => {
          const hash = hashes[index];
          if (!linksByHash.has(hash)) {
            linksByHash.set(hash, {
              moduleId: createdModule.id,
              questionId: questionIdByHash.get(hash)!,
              order: index + 1,
            });
          }
        });
        await tx.moduleQuestion.createMany({ data: [...linksByHash.values()] });
      }
    }

    return test;
  }, { timeout: 60_000 });
}
