import { z } from "zod";

// ---------- Shared import schema ----------

const choiceSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1, "Choice text cannot be empty"),
});

export const questionSchema = z
  .object({
    /** Required for bank-only imports; derived from the section for full-test imports. */
    sectionType: z.enum(["READING_WRITING", "MATH"]).optional(),
    type: z.enum(["MULTIPLE_CHOICE", "STUDENT_PRODUCED_RESPONSE"]),
    domain: z.string().min(1),
    skill: z.string().optional().nullable(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]),
    passage: z.string().optional().nullable(),
    stem: z.string().min(1),
    imageUrl: z
      .string()
      .optional()
      .nullable()
      .refine(
        (v) =>
          !v ||
          v === "" ||
          v.startsWith("http://") ||
          v.startsWith("https://") ||
          v.startsWith("/"),
        { message: "imageUrl must be an absolute URL or a /-rooted path" },
      ),
    imagePosition: z.enum(["TOP", "INLINE"]).optional(),
    imageMaxWidth: z.number().int().min(50).max(2000).optional().nullable(),
    choices: z.array(choiceSchema).optional().nullable(),
    correctAnswer: z.string().min(1),
    acceptedAnswers: z.array(z.string()).optional().nullable(),
    explanation: z.string().optional().nullable(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "MULTIPLE_CHOICE") {
      if (!q.choices || q.choices.length !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MULTIPLE_CHOICE question must have exactly 4 choices",
          path: ["choices"],
        });
        return;
      }
      const labels = new Set(q.choices.map((c) => c.label));
      if (labels.size !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choices must be labeled A, B, C, D (no duplicates)",
          path: ["choices"],
        });
      }
      if (!["A", "B", "C", "D"].includes(q.correctAnswer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "correctAnswer must be A, B, C, or D for multiple-choice",
          path: ["correctAnswer"],
        });
      }
    } else {
      if (!q.acceptedAnswers || q.acceptedAnswers.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "STUDENT_PRODUCED_RESPONSE requires at least one acceptedAnswers entry",
          path: ["acceptedAnswers"],
        });
      }
    }
  });

const moduleSchema = z.object({
  moduleNumber: z.union([z.literal(1), z.literal(2)]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]),
  questions: z.array(questionSchema).min(1, "Module must have at least one question"),
});

const sectionSchema = z.object({
  type: z.enum(["READING_WRITING", "MATH"]),
  order: z.number().int().min(1),
  module1TimeLimit: z.number().int().min(60).max(60 * 60 * 3),
  module2TimeLimit: z.number().int().min(60).max(60 * 60 * 3),
  modules: z.array(moduleSchema).min(2),
});

const testSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  mode: z.enum(["ADAPTIVE", "LINEAR"]),
  isPublic: z.boolean().default(false),
  adaptiveThreshold: z.number().min(0).max(1).optional().default(0.6),
});

export const importSchema = z
  .object({
    test: testSchema,
    sections: z.array(sectionSchema).min(1),
  })
  .superRefine((payload, ctx) => {
    // Adaptive tests: each section's Module 2 needs BOTH an EASY and a HARD variant.
    if (payload.test.mode === "ADAPTIVE") {
      payload.sections.forEach((s, si) => {
        const m2 = s.modules.filter((m) => m.moduleNumber === 2);
        const hasEasy = m2.some((m) => m.difficulty === "EASY");
        const hasHard = m2.some((m) => m.difficulty === "HARD");
        if (!hasEasy || !hasHard) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Adaptive section "${s.type}" (index ${si}) must have both an EASY and a HARD Module 2.`,
            path: ["sections", si, "modules"],
          });
        }
        const m1 = s.modules.filter((m) => m.moduleNumber === 1);
        if (m1.length !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Section "${s.type}" must have exactly one Module 1.`,
            path: ["sections", si, "modules"],
          });
        }
      });
    } else {
      // Linear: exactly one Module 1 and one Module 2 per section.
      payload.sections.forEach((s, si) => {
        const m1 = s.modules.filter((m) => m.moduleNumber === 1);
        const m2 = s.modules.filter((m) => m.moduleNumber === 2);
        if (m1.length !== 1 || m2.length !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Linear section "${s.type}" must have exactly one Module 1 and one Module 2.`,
            path: ["sections", si, "modules"],
          });
        }
      });
    }
  });

export type ImportPayload = z.infer<typeof importSchema>;

/**
 * Bank-only import. The presence of `import: "questions"` at the top level
 * distinguishes this from a full-test import.
 */
/**
 * Bank-only questions must declare their `sectionType` explicitly — there's
 * no surrounding section to infer it from.
 */
const bankQuestionSchema = questionSchema.superRefine((q, ctx) => {
  if (!q.sectionType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "sectionType is required for bank-only imports (MATH or READING_WRITING)",
      path: ["sectionType"],
    });
  }
});

export const bankImportSchema = z.object({
  import: z.literal("questions"),
  questions: z.array(bankQuestionSchema).min(1, "questions array cannot be empty"),
});

export type BankImportPayload = z.infer<typeof bankImportSchema>;

/** Flatten Zod issues into row-style error strings with the JSON path. */
export function flattenIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `${path}: ${i.message}`;
  });
}
