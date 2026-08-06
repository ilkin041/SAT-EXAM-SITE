"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const idSchema = z.string().min(1);

// ---------- Assign one ----------

export async function assignQuestionToModule(moduleId: string, questionId: string) {
  await requireAdmin();
  if (!idSchema.safeParse(moduleId).success || !idSchema.safeParse(questionId).success) {
    return { ok: false as const, error: "Invalid id" };
  }

  // Make sure the question's section type matches the module's section type.
  const [mod, q] = await Promise.all([
    prisma.module.findUnique({
      where: { id: moduleId },
      include: { section: { select: { type: true } } },
    }),
    prisma.question.findUnique({
      where: { id: questionId },
      select: { sectionType: true },
    }),
  ]);
  if (!mod) return { ok: false as const, error: "Module not found" };
  if (!q) return { ok: false as const, error: "Question not found" };
  if (mod.section.type !== q.sectionType) {
    return {
      ok: false as const,
      error: `Section-type mismatch: this question is ${q.sectionType === "MATH" ? "Math" : "Reading & Writing"} but the module is ${mod.section.type === "MATH" ? "Math" : "Reading & Writing"}.`,
    };
  }

  const max = await prisma.moduleQuestion.aggregate({
    where: { moduleId },
    _max: { order: true },
  });
  const nextOrder = (max._max.order ?? 0) + 1;

  try {
    const created = await prisma.moduleQuestion.create({
      data: { moduleId, questionId, order: nextOrder },
    });
    revalidatePath("/admin/tests");
    return { ok: true as const, id: created.id, order: nextOrder };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false as const, error: "Question is already in this module" };
    }
    throw err;
  }
}

// ---------- Bulk assign ----------

export async function bulkAssignQuestionsToModule(moduleId: string, questionIds: string[]) {
  await requireAdmin();
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return { ok: false as const, error: "No questions selected" };
  }
  const cleanIds = Array.from(new Set(questionIds.filter((s) => typeof s === "string" && s.length > 0)));
  if (cleanIds.length === 0) return { ok: false as const, error: "No questions selected" };

  const addedIds = await prisma.$transaction(async (tx) => {
    const [module, existing, questions, max] = await Promise.all([
      tx.module.findUnique({
        where: { id: moduleId },
        select: { section: { select: { type: true } } },
      }),
      tx.moduleQuestion.findMany({
        where: { moduleId, questionId: { in: cleanIds } },
        select: { questionId: true },
      }),
      tx.question.findMany({
        where: { id: { in: cleanIds } },
        select: { id: true, sectionType: true },
      }),
      tx.moduleQuestion.aggregate({ where: { moduleId }, _max: { order: true } }),
    ]);
    if (!module) return [];
    const skip = new Set(existing.map((link) => link.questionId));
    const eligible = questions.filter(
      (question) =>
        question.sectionType === module.section.type && !skip.has(question.id),
    );
    const startingOrder = max._max.order ?? 0;
    if (eligible.length > 0) {
      await tx.moduleQuestion.createMany({
        data: eligible.map((question, index) => ({
          moduleId,
          questionId: question.id,
          order: startingOrder + index + 1,
        })),
      });
    }
    return eligible.map((question) => question.id);
  }, { timeout: 15_000 });

  revalidatePath("/admin/tests");
  return { ok: true as const, addedCount: addedIds.length, addedIds };
}

// ---------- Remove ----------

export async function removeQuestionFromModule(moduleId: string, questionId: string) {
  await requireAdmin();
  if (!idSchema.safeParse(moduleId).success || !idSchema.safeParse(questionId).success) {
    return { ok: false as const, error: "Invalid id" };
  }

  await prisma.moduleQuestion.deleteMany({ where: { moduleId, questionId } });

  revalidatePath("/admin/tests");
  return { ok: true as const };
}

// ---------- Fractional reorder (one write) ----------

export async function reorderModuleQuestion(
  moduleId: string,
  questionId: string,
  targetIndex: number,
) {
  await requireAdmin();
  if (!Number.isInteger(targetIndex) || targetIndex < 0) {
    return { ok: false as const, error: "Invalid target position" };
  }
  const all = await prisma.moduleQuestion.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
  });
  const target = all.find((link) => link.questionId === questionId);
  if (!target) return { ok: false as const, error: "Question is not in this module" };
  const remaining = all.filter((link) => link.id !== target.id);
  const insertionIndex = Math.min(targetIndex, remaining.length);
  const previous = remaining[insertionIndex - 1];
  const next = remaining[insertionIndex];
  const order =
    previous && next
      ? (previous.order + next.order) / 2
      : previous
        ? previous.order + 1024
        : next
          ? next.order - 1024
          : 1024;
  await prisma.moduleQuestion.update({ where: { id: target.id }, data: { order } });

  revalidatePath("/admin/tests");
  return { ok: true as const };
}
