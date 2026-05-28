"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

// ---------- Schemas ----------

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  mode: z.enum(["ADAPTIVE", "LINEAR"]),
  isPublic: z.boolean(),
  adaptiveThreshold: z.number().min(0).max(1).default(0.6),
});

const updateSchema = createSchema.extend({ id: z.string() });

const sectionTimesSchema = z.object({
  sectionId: z.string(),
  module1TimeLimit: z.number().int().min(60).max(60 * 60 * 3),
  module2TimeLimit: z.number().int().min(60).max(60 * 60 * 3),
});

export type CreateTestInput = z.infer<typeof createSchema>;
export type UpdateTestInput = z.infer<typeof updateSchema>;

// ---------- Test CRUD ----------

export async function createTest(input: CreateTestInput) {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  // Standard SAT skeleton: R&W (32 min/module) + Math (35 min/module).
  // For adaptive, Module 2 has both an EASY and HARD variant so the engine
  // can route. For linear, Module 2 is a single MIXED bucket.
  const rwModules =
    data.mode === "ADAPTIVE"
      ? [
          { moduleNumber: 1, difficulty: "MIXED" as const },
          { moduleNumber: 2, difficulty: "EASY" as const },
          { moduleNumber: 2, difficulty: "HARD" as const },
        ]
      : [
          { moduleNumber: 1, difficulty: "MIXED" as const },
          { moduleNumber: 2, difficulty: "MIXED" as const },
        ];

  const test = await prisma.test.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      mode: data.mode,
      isPublic: data.isPublic,
      adaptiveThreshold: data.adaptiveThreshold,
      createdById: admin.id,
      sections: {
        create: [
          {
            type: "READING_WRITING",
            order: 1,
            module1TimeLimit: 1920, // 32 minutes
            module2TimeLimit: 1920,
            modules: { create: rwModules },
          },
          {
            type: "MATH",
            order: 2,
            module1TimeLimit: 2100, // 35 minutes
            module2TimeLimit: 2100,
            modules: { create: rwModules },
          },
        ],
      },
    },
  });

  revalidatePath("/admin/tests");
  return { ok: true as const, id: test.id };
}

export async function updateTest(input: UpdateTestInput) {
  await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { id, ...data } = parsed.data;
  await prisma.test.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description ?? null,
      mode: data.mode,
      isPublic: data.isPublic,
      adaptiveThreshold: data.adaptiveThreshold,
    },
  });
  revalidatePath("/admin/tests");
  revalidatePath(`/admin/tests/${id}`);
  return { ok: true as const, id };
}

export async function deleteTest(id: string) {
  await requireAdmin();
  await prisma.test.delete({ where: { id } });
  revalidatePath("/admin/tests");
  redirect("/admin/tests");
}

// ---------- Section / Module helpers ----------

export async function updateSectionTimes(input: z.infer<typeof sectionTimesSchema>) {
  await requireAdmin();
  const parsed = sectionTimesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;
  const section = await prisma.section.update({
    where: { id: data.sectionId },
    data: {
      module1TimeLimit: data.module1TimeLimit,
      module2TimeLimit: data.module2TimeLimit,
    },
    select: { testId: true },
  });
  revalidatePath(`/admin/tests/${section.testId}`);
  return { ok: true as const };
}

export async function deleteQuestionFromTest(questionId: string, testId: string) {
  await requireAdmin();
  await prisma.question.delete({ where: { id: questionId } });
  revalidatePath(`/admin/tests/${testId}`);
}

// ---------- Duplicate ----------

const duplicateSchema = z.object({
  testId: z.string().min(1),
  newTitle: z.string().trim().min(1, "Title is required").max(200),
});

/**
 * Duplicates a Test along with its Sections, Modules, and ModuleQuestion
 * rows. Question records are SHARED — the bank is global, so the copy just
 * references the same Questions. Created as `isPublic: false` regardless of
 * the source per spec.
 */
export async function duplicateTest(input: { testId: string; newTitle: string }) {
  const admin = await requireAdmin();
  const parsed = duplicateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { testId, newTitle } = parsed.data;

  const source = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          modules: {
            orderBy: { moduleNumber: "asc" },
            include: {
              moduleQuestions: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!source) return { ok: false as const, error: "Source test not found" };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const newTest = await tx.test.create({
        data: {
          title: newTitle,
          description: source.description,
          mode: source.mode,
          isPublic: false,
          adaptiveThreshold: source.adaptiveThreshold,
          scoringTable: source.scoringTable ?? undefined,
          createdById: admin.id,
        },
      });

      for (const s of source.sections) {
        const newSection = await tx.section.create({
          data: {
            testId: newTest.id,
            type: s.type,
            order: s.order,
            module1TimeLimit: s.module1TimeLimit,
            module2TimeLimit: s.module2TimeLimit,
          },
        });

        for (const m of s.modules) {
          const newModule = await tx.module.create({
            data: {
              sectionId: newSection.id,
              moduleNumber: m.moduleNumber,
              difficulty: m.difficulty,
            },
          });

          if (m.moduleQuestions.length > 0) {
            await tx.moduleQuestion.createMany({
              data: m.moduleQuestions.map((mq) => ({
                moduleId: newModule.id,
                questionId: mq.questionId,
                order: mq.order,
              })),
            });
          }
        }
      }

      return newTest;
    });

    revalidatePath("/admin/tests");
    return { ok: true as const, testId: created.id };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message || "Duplication failed" };
  }
}
