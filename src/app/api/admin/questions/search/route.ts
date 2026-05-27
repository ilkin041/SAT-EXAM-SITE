import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Difficulty, QuestionType, SectionType } from "@prisma/client";

/**
 * Question-bank search used by the test builder's "Add from bank" slide-over.
 *
 * Query params:
 *   q            — text search across stem/passage/domain/skill
 *   type         — MULTIPLE_CHOICE | STUDENT_PRODUCED_RESPONSE
 *   difficulty   — EASY | MEDIUM | HARD | MIXED
 *   domain       — exact match
 *   skill        — exact match
 *   moduleId     — if set, results include `inModule: boolean` for each row
 *   limit        — 1..200, default 50
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const difficulty = url.searchParams.get("difficulty") ?? "";
  const domain = url.searchParams.get("domain") ?? "";
  const skill = url.searchParams.get("skill") ?? "";
  const sectionType = url.searchParams.get("sectionType") ?? "";
  const moduleId = url.searchParams.get("moduleId") ?? "";
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));

  const where: Record<string, unknown> = {};
  if (q.trim()) {
    where.OR = [
      { stem: { contains: q, mode: "insensitive" } },
      { passage: { contains: q, mode: "insensitive" } },
      { domain: { contains: q, mode: "insensitive" } },
      { skill: { contains: q, mode: "insensitive" } },
    ];
  }
  if (type) where.type = type as QuestionType;
  if (difficulty) where.difficulty = difficulty as Difficulty;
  if (domain) where.domain = domain;
  if (skill) where.skill = skill;
  if (sectionType) where.sectionType = sectionType as SectionType;

  const questions = await prisma.question.findMany({
    where,
    orderBy: { id: "desc" },
    take: limit,
    select: {
      id: true,
      sectionType: true,
      type: true,
      domain: true,
      skill: true,
      difficulty: true,
      stem: true,
      _count: { select: { moduleAssignments: true } },
    },
  });

  let inModuleSet = new Set<string>();
  if (moduleId) {
    const links = await prisma.moduleQuestion.findMany({
      where: { moduleId, questionId: { in: questions.map((q) => q.id) } },
      select: { questionId: true },
    });
    inModuleSet = new Set(links.map((l) => l.questionId));
  }

  return NextResponse.json({
    ok: true,
    questions: questions.map((q) => ({
      id: q.id,
      sectionType: q.sectionType,
      type: q.type,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      stemPreview: stripHtml(q.stem),
      assignmentCount: q._count.moduleAssignments,
      inModule: moduleId ? inModuleSet.has(q.id) : false,
    })),
  });
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
}
