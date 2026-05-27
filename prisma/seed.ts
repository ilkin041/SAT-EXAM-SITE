import { PrismaClient, Role, TestMode, SectionType, Difficulty, QuestionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type ImportChoice = { label: "A" | "B" | "C" | "D"; text: string };
type ImportQuestion = {
  type: keyof typeof QuestionType;
  domain: string;
  skill?: string;
  difficulty: keyof typeof Difficulty;
  passage?: string | null;
  stem: string;
  imageUrl?: string | null;
  choices?: ImportChoice[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation?: string | null;
};
type ImportModule = {
  moduleNumber: 1 | 2;
  difficulty: keyof typeof Difficulty;
  questions: ImportQuestion[];
};
type ImportSection = {
  type: keyof typeof SectionType;
  order: number;
  module1TimeLimit: number;
  module2TimeLimit: number;
  modules: ImportModule[];
};
type ImportPayload = {
  test: {
    title: string;
    description?: string;
    mode: keyof typeof TestMode;
    isPublic: boolean;
    adaptiveThreshold?: number;
  };
  sections: ImportSection[];
};

async function upsertUser(email: string, password: string, name: string, role: Role) {
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, password: hashed },
    create: { email, name, role, password: hashed },
  });
}

async function createTestFromPayload(payload: ImportPayload, createdById: string) {
  const test = await prisma.test.create({
    data: {
      title: payload.test.title,
      description: payload.test.description,
      mode: TestMode[payload.test.mode],
      isPublic: payload.test.isPublic,
      adaptiveThreshold: payload.test.adaptiveThreshold ?? 0.6,
      createdById,
    },
  });

  for (const section of payload.sections) {
    const createdSection = await prisma.section.create({
      data: {
        testId: test.id,
        type: SectionType[section.type],
        order: section.order,
        module1TimeLimit: section.module1TimeLimit,
        module2TimeLimit: section.module2TimeLimit,
      },
    });

    for (const mod of section.modules) {
      const createdModule = await prisma.module.create({
        data: {
          sectionId: createdSection.id,
          moduleNumber: mod.moduleNumber,
          difficulty: Difficulty[mod.difficulty],
        },
      });

      for (let i = 0; i < mod.questions.length; i++) {
        const q = mod.questions[i];
        // 1) Create the bank question (no module link yet).
        const createdQuestion = await prisma.question.create({
          data: {
            // Inherit section type from the section the seed is placing it in.
            sectionType: SectionType[section.type],
            type: QuestionType[q.type],
            domain: q.domain,
            skill: q.skill,
            difficulty: Difficulty[q.difficulty],
            passage: q.passage ?? null,
            stem: q.stem,
            imageUrl: q.imageUrl ?? null,
            choices: q.choices ? (q.choices as unknown as object) : undefined,
            correctAnswer: q.correctAnswer,
            acceptedAnswers: q.acceptedAnswers ? (q.acceptedAnswers as unknown as object) : undefined,
            explanation: q.explanation ?? null,
          },
        });
        // 2) Link it into this module at the right order.
        await prisma.moduleQuestion.create({
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
}

async function main() {
  console.log("Seeding users...");
  const admin = await upsertUser("admin@example.com", "admin123", "Admin User", Role.ADMIN);
  const student = await upsertUser("student@example.com", "student123", "Sample Student", Role.STUDENT);

  console.log("Loading sample-test.json...");
  const samplePath = join(process.cwd(), "sample-test.json");
  const payload = JSON.parse(readFileSync(samplePath, "utf8")) as ImportPayload;

  const existing = await prisma.test.findFirst({ where: { title: payload.test.title } });
  if (existing) {
    console.log(`Sample test already exists (id=${existing.id}). Skipping creation.`);
  } else {
    const test = await createTestFromPayload(payload, admin.id);
    console.log(`Created sample test: ${test.title} (id=${test.id})`);
  }

  console.log("\nSeed complete.");
  console.log(`  Admin:   ${admin.email} / admin123`);
  console.log(`  Student: ${student.email} / student123`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
