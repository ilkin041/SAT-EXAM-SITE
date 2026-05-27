"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const choiceSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string(),
});

// Bank-only question payload. No module/order — those live on ModuleQuestion
// and are managed by the test builder.
const baseSchema = z.object({
  sectionType: z.enum(["READING_WRITING", "MATH"]),
  type: z.enum(["MULTIPLE_CHOICE", "STUDENT_PRODUCED_RESPONSE"]),
  domain: z.string().min(1, "Domain is required"),
  skill: z.string().optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]),
  passage: z.string().optional().nullable(),
  stem: z.string().min(1, "Stem is required"),
  imageUrl: z
    .union([z.string().min(1), z.literal(""), z.null()])
    .optional()
    .transform((v) => {
      if (!v) return null;
      if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) {
        return v;
      }
      return null;
    }),
  imagePosition: z.enum(["TOP", "INLINE"]).default("INLINE"),
  imageMaxWidth: z
    .union([z.number().int().min(50).max(2000), z.null()])
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  choices: z.array(choiceSchema).optional().nullable(),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  acceptedAnswers: z.array(z.string()).optional().nullable(),
  explanation: z.string().optional().nullable(),
});

export type QuestionInput = z.infer<typeof baseSchema>;

function validate(input: QuestionInput) {
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  if (data.type === "MULTIPLE_CHOICE") {
    if (!data.choices || data.choices.length !== 4) {
      return { ok: false as const, error: "Multiple-choice questions require exactly 4 choices." };
    }
    const labels = new Set(data.choices.map((c) => c.label));
    if (labels.size !== 4) {
      return { ok: false as const, error: "Choices must be labeled A, B, C, D (no duplicates)." };
    }
    if (!["A", "B", "C", "D"].includes(data.correctAnswer)) {
      return { ok: false as const, error: "Correct answer must be A, B, C, or D." };
    }
  } else {
    if (!data.acceptedAnswers || data.acceptedAnswers.length === 0) {
      return {
        ok: false as const,
        error: "Student-produced response requires at least one accepted answer.",
      };
    }
  }
  return { ok: true as const, data };
}

export async function createQuestion(input: QuestionInput) {
  await requireAdmin();
  const v = validate(input);
  if (!v.ok) return { ok: false as const, error: v.error };

  const data = v.data;
  const created = await prisma.question.create({
    data: {
      sectionType: data.sectionType,
      type: data.type,
      domain: data.domain,
      skill: data.skill ?? null,
      difficulty: data.difficulty,
      passage: data.passage ?? null,
      stem: data.stem,
      imageUrl: data.imageUrl ?? null,
      imagePosition: data.imagePosition,
      imageMaxWidth: data.imageMaxWidth ?? null,
      choices: data.type === "MULTIPLE_CHOICE" ? (data.choices as unknown as object) : undefined,
      correctAnswer: data.correctAnswer,
      acceptedAnswers:
        data.type === "STUDENT_PRODUCED_RESPONSE"
          ? (data.acceptedAnswers as unknown as object)
          : undefined,
      explanation: data.explanation ?? null,
    },
  });

  revalidatePath("/admin/questions");
  return { ok: true as const, id: created.id };
}

export async function updateQuestion(id: string, input: QuestionInput) {
  await requireAdmin();
  const v = validate(input);
  if (!v.ok) return { ok: false as const, error: v.error };

  const data = v.data;

  // Changing sectionType while the question is assigned to incompatible modules
  // would create silent drift. Block it with a useful message.
  const existing = await prisma.question.findUnique({
    where: { id },
    include: {
      moduleAssignments: {
        include: {
          module: { include: { section: { select: { type: true } } } },
        },
      },
    },
  });
  if (!existing) return { ok: false as const, error: "Question not found" };

  if (existing.sectionType !== data.sectionType) {
    const mismatched = existing.moduleAssignments.filter(
      (mq) => mq.module.section.type !== data.sectionType,
    );
    if (mismatched.length > 0) {
      return {
        ok: false as const,
        error: `Can't change section type — this question is assigned to ${mismatched.length} module${mismatched.length === 1 ? "" : "s"} in the old section. Remove it from those modules first.`,
      };
    }
  }

  await prisma.question.update({
    where: { id },
    data: {
      sectionType: data.sectionType,
      type: data.type,
      domain: data.domain,
      skill: data.skill ?? null,
      difficulty: data.difficulty,
      passage: data.passage ?? null,
      stem: data.stem,
      imageUrl: data.imageUrl ?? null,
      imagePosition: data.imagePosition,
      imageMaxWidth: data.imageMaxWidth ?? null,
      choices:
        data.type === "MULTIPLE_CHOICE"
          ? (data.choices as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      correctAnswer: data.correctAnswer,
      acceptedAnswers:
        data.type === "STUDENT_PRODUCED_RESPONSE"
          ? (data.acceptedAnswers as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      explanation: data.explanation ?? null,
    },
  });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  return { ok: true as const, id };
}

export async function deleteQuestion(id: string) {
  await requireAdmin();
  // Cascade through ModuleQuestion via FK; Answer/Annotation also cascade.
  try {
    await prisma.question.delete({ where: { id } });
    revalidatePath("/admin/questions");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message || "Failed to delete" };
  }
}

/**
 * Lookup for the delete-question modal: returns every module this question is
 * currently assigned to, with its test and section context.
 */
export async function getQuestionAssignments(id: string) {
  await requireAdmin();
  const assignments = await prisma.moduleQuestion.findMany({
    where: { questionId: id },
    orderBy: { createdAt: "asc" },
    include: {
      module: {
        include: {
          section: {
            select: {
              type: true,
              test: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });
  return assignments.map((a) => ({
    id: a.id,
    testId: a.module.section.test.id,
    testTitle: a.module.section.test.title,
    sectionType: a.module.section.type as "READING_WRITING" | "MATH",
    moduleNumber: a.module.moduleNumber,
    difficulty: a.module.difficulty as "EASY" | "MEDIUM" | "HARD" | "MIXED",
  }));
}

export type QuestionAssignment = Awaited<ReturnType<typeof getQuestionAssignments>>[number];
