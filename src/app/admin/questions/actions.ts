"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { questionContentHash } from "@/lib/question-content-hash";
import { renderQuestionHtml } from "@/lib/rendered-question";
import { createSkillRow, loadTaxonomy, type TaxonomyTables } from "@/lib/taxonomy-db";
import { DEMO_QUESTIONS_TAG } from "@/lib/demo-question";

const choiceSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string(),
});

// Bank-only question payload. No module/order — those live on ModuleQuestion
// and are managed by the test builder.
const baseSchema = z.object({
  sectionType: z.enum(["READING_WRITING", "MATH"]),
  type: z.enum(["MULTIPLE_CHOICE", "STUDENT_PRODUCED_RESPONSE"]),
  /** An id from the `Domain` table. The form only ever offers real ones. */
  domainId: z.string().min(1, "Domain is required"),
  /** An id from the `Skill` table, or null for untagged. */
  skillId: z.string().nullable().optional(),
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
  /**
   * T3.3. Opt-in to the landing page's public demo. Defaults to false and is
   * only ever set from the question form: it asserts the question is
   * originally authored, which is a claim no bulk action or import can make on
   * a tutor's behalf.
   */
  publicDemo: z.boolean().optional().default(false),
});

export type QuestionInput = z.infer<typeof baseSchema>;

/**
 * Validate the payload *and* the taxonomy ids against the tables. The ids come
 * from a `Select` the server rendered, so a mismatch is a stale tab or a hand
 * -crafted request rather than a typo — but this is the last gate before a
 * write, and the FK would otherwise surface as a Prisma error nobody can read.
 */
async function validate(input: QuestionInput) {
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const tables = await loadTaxonomy();
  const domain = tables.domains.find((d) => d.id === data.domainId);
  if (!domain) {
    return { ok: false as const, error: "Choose a domain from the list." };
  }
  if (domain.sectionType !== data.sectionType) {
    return { ok: false as const, error: "The selected domain does not belong to this section." };
  }
  if (data.skillId) {
    const skill = tables.skills.find((s) => s.id === data.skillId);
    if (!skill) return { ok: false as const, error: "Choose a skill from the list." };
    if (skill.domainId !== domain.id) {
      return {
        ok: false as const,
        error: `"${skill.name}" is not a ${domain.name} skill. Pick a skill from this domain, or change the domain.`,
      };
    }
  }

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
  // T3.3. The demo serves multiple-choice only and shows the explanation as
  // its payoff, so a flagged question missing either would render a broken
  // section on the landing page. Fail here, where the person who flagged it is
  // reading the message.
  if (data.publicDemo) {
    if (data.type !== "MULTIPLE_CHOICE") {
      return {
        ok: false as const,
        error: "The public demo shows multiple-choice questions only. Turn it off, or change the question type.",
      };
    }
    if (!data.explanation?.trim()) {
      return {
        ok: false as const,
        error: "A public demo question needs an explanation — that is what the visitor reads after answering.",
      };
    }
  }

  return { ok: true as const, data };
}

export async function createQuestion(input: QuestionInput) {
  await requireAdmin();
  const v = await validate(input);
  if (!v.ok) return { ok: false as const, error: v.error };

  const data = v.data;
  const created = await prisma.question.create({
    data: {
      sectionType: data.sectionType,
      type: data.type,
      domainId: data.domainId,
      skillId: data.skillId ?? null,
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
      publicDemo: data.publicDemo,
      contentHash: questionContentHash({ stem: data.stem, passage: data.passage }),
      renderedHtml: renderQuestionHtml({
        stem: data.stem,
        passage: data.passage,
        explanation: data.explanation,
        choices: data.type === "MULTIPLE_CHOICE" ? data.choices : null,
      }) as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/admin/questions");
  // T3.3: the landing demo caches its query for an hour. Flagging a question
  // should show up on `/` when the tutor goes to look, not an hour later.
  revalidateTag(DEMO_QUESTIONS_TAG);
  return { ok: true as const, id: created.id };
}

export async function updateQuestion(id: string, input: QuestionInput) {
  await requireAdmin();
  const v = await validate(input);
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
      domainId: data.domainId,
      skillId: data.skillId ?? null,
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
      publicDemo: data.publicDemo,
      contentHash: questionContentHash({ stem: data.stem, passage: data.passage }),
      renderedHtml: renderQuestionHtml({
        stem: data.stem,
        passage: data.passage,
        explanation: data.explanation,
        choices: data.type === "MULTIPLE_CHOICE" ? data.choices : null,
      }) as unknown as Prisma.InputJsonValue,
    },
  });

  // Retagging is what the review queue is for, so naming a skill resolves the
  // row. `deleteMany` rather than the one-to-one `delete` — most questions have
  // no review row, and a missing one is not an error.
  if (data.skillId) {
    await prisma.taxonomyReview.deleteMany({ where: { questionId: id } });
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  revalidateTag(DEMO_QUESTIONS_TAG);
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

export async function findLikelyDuplicateQuestion(input: {
  stem: string;
  passage?: string | null;
  excludeId?: string;
}) {
  await requireAdmin();
  if (!input.stem.trim()) return null;
  const contentHash = questionContentHash(input);
  return prisma.question.findFirst({
    where: {
      contentHash,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { id: true, stem: true },
    orderBy: { createdAt: "asc" },
  });
}

// ---------- Bulk operations ----------

const bulkIdsSchema = z
  .array(z.string().min(1))
  .min(1, "Select at least one question.")
  .max(500, "Too many questions selected — please narrow your selection.");

/**
 * Delete every selected question. Cascades through `ModuleQuestion`, `Answer`,
 * and `Annotation`. Returns the count actually deleted so the caller can
 * surface "deleted N questions" feedback.
 */
export async function bulkDeleteQuestions(ids: string[]) {
  await requireAdmin();
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid selection" };
  }
  try {
    const result = await prisma.question.deleteMany({
      where: { id: { in: parsed.data } },
    });
    revalidatePath("/admin/questions");
    return { ok: true as const, deleted: result.count };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message || "Bulk delete failed" };
  }
}

/**
 * Update difficulty on a batch of questions. Difficulty is a free-form tag
 * (the question payload validator doesn't constrain it cross-module), so this
 * is safe to apply blindly to the selection.
 */
export async function bulkSetDifficulty(
  ids: string[],
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED",
) {
  await requireAdmin();
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid selection" };
  }
  if (!["EASY", "MEDIUM", "HARD", "MIXED"].includes(difficulty)) {
    return { ok: false as const, error: "Invalid difficulty" };
  }
  try {
    const result = await prisma.question.updateMany({
      where: { id: { in: parsed.data } },
      data: { difficulty },
    });
    revalidatePath("/admin/questions");
    return { ok: true as const, updated: result.count };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message || "Bulk update failed" };
  }
}

/**
 * Move a selection onto a different domain. Takes a `Domain.id`, and clears
 * `skillId` for any question whose current skill does not live under the new
 * domain — a skill belongs to exactly one domain, so leaving it would create
 * precisely the disagreement the T2.2 migration spent 17 questions untangling.
 */
export async function bulkSetDomain(ids: string[], domainId: string) {
  await requireAdmin();
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid selection" };
  }
  const tables = await loadTaxonomy();
  const domain = tables.domains.find((d) => d.id === domainId);
  if (!domain) return { ok: false as const, error: "Choose a domain from the list." };

  const questions = await prisma.question.findMany({
    where: { id: { in: parsed.data } },
    select: { id: true, sectionType: true, skillId: true },
  });
  if (questions.some((question) => question.sectionType !== domain.sectionType)) {
    return {
      ok: false as const,
      error: `The selection includes questions from the other section. "${domain.name}" is ${domain.sectionType === "MATH" ? "Math" : "Reading and Writing"} only.`,
    };
  }

  const keptSkills = new Set(
    tables.skills.filter((s) => s.domainId === domainId).map((s) => s.id),
  );
  const losesSkill = questions
    .filter((question) => question.skillId && !keptSkills.has(question.skillId))
    .map((question) => question.id);

  const [result] = await prisma.$transaction([
    prisma.question.updateMany({
      where: { id: { in: parsed.data } },
      data: { domainId },
    }),
    prisma.question.updateMany({
      where: { id: { in: losesSkill } },
      data: { skillId: null },
    }),
  ]);
  revalidatePath("/admin/questions");
  return { ok: true as const, updated: result.count, skillsCleared: losesSkill.length };
}

/**
 * Tag a selection with a skill, or clear it. `skillId` is an id from the
 * `Skill` table or `null`; there is no free-text path, which is the point of
 * T2.2. Questions whose domain does not own the skill are skipped rather than
 * silently re-domained, and reported back so the count is honest.
 */
export async function bulkSetSkill(ids: string[], skillId: string | null) {
  await requireAdmin();
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid selection" };
  }

  if (skillId === null) {
    const cleared = await prisma.question.updateMany({
      where: { id: { in: parsed.data } },
      data: { skillId: null },
    });
    revalidatePath("/admin/questions");
    return { ok: true as const, updated: cleared.count, skipped: 0 };
  }

  const tables = await loadTaxonomy();
  const skill = tables.skills.find((s) => s.id === skillId);
  if (!skill) return { ok: false as const, error: "Choose a skill from the list." };
  const domain = tables.domains.find((d) => d.id === skill.domainId);

  const eligible = await prisma.question.findMany({
    where: { id: { in: parsed.data }, domainId: skill.domainId },
    select: { id: true },
  });
  const eligibleIds = eligible.map((question) => question.id);
  const skipped = parsed.data.length - eligibleIds.length;

  if (eligibleIds.length === 0) {
    return {
      ok: false as const,
      error: `None of the selected questions are in ${domain?.name ?? "that domain"}, so "${skill.name}" does not apply to them.`,
    };
  }

  const [result] = await prisma.$transaction([
    prisma.question.updateMany({ where: { id: { in: eligibleIds } }, data: { skillId } }),
    // Tagging resolves the review queue for those questions.
    prisma.taxonomyReview.deleteMany({ where: { questionId: { in: eligibleIds } } }),
  ]);
  revalidatePath("/admin/questions");
  return { ok: true as const, updated: result.count, skipped };
}

/**
 * Add a skill to a domain's vocabulary from the question editor. This is the
 * only way the vocabulary grows — see `createSkillRow`, which fold-matches so a
 * second spelling of an existing skill can never be created.
 */
export async function createSkill(domainId: string, name: string) {
  await requireAdmin();
  const result = await createSkillRow(domainId, name);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath("/admin/questions");
  return { ok: true as const, skill: result.value };
}

/** The full vocabulary, for the question form's two `Select`s. */
export async function listTaxonomy(): Promise<TaxonomyTables> {
  await requireAdmin();
  return loadTaxonomy();
}

/**
 * Assign a batch of questions to a single module. Skips:
 *  - questions already in the module (idempotent),
 *  - questions whose `sectionType` doesn't match the target module's section
 *    (those would be invalid assignments).
 *
 * Returns counts for both `assigned` and `skipped` so the UI can show
 * "Assigned 12, skipped 3 (already in module or wrong section type)".
 */
export async function bulkAssignToModule(ids: string[], moduleId: string) {
  await requireAdmin();
  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid selection" };
  }
  if (!moduleId) {
    return { ok: false as const, error: "Pick a module first." };
  }

  const targetModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      section: { select: { type: true, test: { select: { id: true, title: true } } } },
      moduleQuestions: { select: { questionId: true } },
    },
  });
  if (!targetModule) return { ok: false as const, error: "Module not found" };

  const questions = await prisma.question.findMany({
    where: { id: { in: parsed.data } },
    select: { id: true, sectionType: true },
  });

  const alreadyIn = new Set(targetModule.moduleQuestions.map((mq) => mq.questionId));
  const startingOrder = targetModule.moduleQuestions.length;

  const eligible = questions.filter(
    (q) => q.sectionType === targetModule.section.type && !alreadyIn.has(q.id),
  );

  if (eligible.length === 0) {
    return {
      ok: true as const,
      assigned: 0,
      skipped: questions.length,
      testId: targetModule.section.test.id,
      moduleSummary: `${targetModule.section.test.title} · Module ${targetModule.moduleNumber}`,
    };
  }

  await prisma.moduleQuestion.createMany({
    data: eligible.map((q, i) => ({
      moduleId,
      questionId: q.id,
      order: startingOrder + i + 1,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/tests/${targetModule.section.test.id}`);
  return {
    ok: true as const,
    assigned: eligible.length,
    skipped: questions.length - eligible.length,
    testId: targetModule.section.test.id,
    moduleSummary: `${targetModule.section.test.title} · Module ${targetModule.moduleNumber}`,
  };
}

/**
 * List every module across every test for the bulk-assign dropdown. Grouped
 * client-side by test name.
 */
const getCachedAssignableModules = unstable_cache(async () => {
  const tests = await prisma.test.findMany({
    orderBy: { title: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          modules: { orderBy: { moduleNumber: "asc" } },
        },
      },
    },
  });
  return tests.map((t) => ({
    testId: t.id,
    testTitle: t.title,
    modules: t.sections.flatMap((s) =>
      s.modules.map((m) => ({
        id: m.id,
        label: `${s.type === "READING_WRITING" ? "R&W" : "Math"} · Module ${m.moduleNumber}${m.difficulty === "MIXED" ? "" : ` (${m.difficulty})`}`,
        sectionType: s.type as "READING_WRITING" | "MATH",
      })),
    ),
  }));
}, ["admin-assignable-modules"], { revalidate: 60 });

export async function listAssignableModules() {
  await requireAdmin();
  return getCachedAssignableModules();
}

export type AssignableTest = Awaited<ReturnType<typeof listAssignableModules>>[number];
