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

  await prisma.$transaction(async (tx) => {
    const existing = await tx.moduleQuestion.findMany({
      where: { moduleId, questionId: { in: cleanIds } },
      select: { questionId: true },
    });
    const skip = new Set(existing.map((e) => e.questionId));

    const max = await tx.moduleQuestion.aggregate({
      where: { moduleId },
      _max: { order: true },
    });
    let next = (max._max.order ?? 0) + 1;

    for (const qid of cleanIds) {
      if (skip.has(qid)) continue;
      await tx.moduleQuestion.create({
        data: { moduleId, questionId: qid, order: next++ },
      });
    }
  });

  revalidatePath("/admin/tests");
  return { ok: true as const, addedCount: cleanIds.length };
}

// ---------- Remove + re-sequence ----------

export async function removeQuestionFromModule(moduleId: string, questionId: string) {
  await requireAdmin();
  if (!idSchema.safeParse(moduleId).success || !idSchema.safeParse(questionId).success) {
    return { ok: false as const, error: "Invalid id" };
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.moduleQuestion.findUnique({
      where: { moduleId_questionId: { moduleId, questionId } },
    });
    if (!target) return;
    await tx.moduleQuestion.delete({ where: { id: target.id } });

    // Re-sequence the survivors to a clean 1..N. Two-pass because the
    // (moduleId, order) unique constraint forbids transient duplicates.
    const remaining = await tx.moduleQuestion.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.moduleQuestion.update({
        where: { id: remaining[i].id },
        data: { order: -(i + 1) },
      });
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx.moduleQuestion.update({
        where: { id: remaining[i].id },
        data: { order: i + 1 },
      });
    }
  });

  revalidatePath("/admin/tests");
  return { ok: true as const };
}

// ---------- Reorder (swap with neighbor) ----------

export async function reorderModuleQuestion(
  moduleId: string,
  questionId: string,
  direction: "up" | "down",
) {
  await requireAdmin();
  if (direction !== "up" && direction !== "down") {
    return { ok: false as const, error: "Invalid direction" };
  }

  await prisma.$transaction(async (tx) => {
    const all = await tx.moduleQuestion.findMany({
      where: { moduleId },
      orderBy: { order: "asc" },
    });
    const idx = all.findIndex((mq) => mq.questionId === questionId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= all.length) return;

    const a = all[idx];
    const b = all[swapIdx];
    // Three-step swap: park `a` at a negative sentinel value to free its slot,
    // move `b` into `a`'s slot, then move `a` into `b`'s old slot.
    await tx.moduleQuestion.update({ where: { id: a.id }, data: { order: -1 } });
    await tx.moduleQuestion.update({ where: { id: b.id }, data: { order: a.order } });
    await tx.moduleQuestion.update({ where: { id: a.id }, data: { order: b.order } });
  });

  revalidatePath("/admin/tests");
  return { ok: true as const };
}
