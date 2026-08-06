import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  computeAttemptRoutes,
  computeRawScores,
  computeScaledScores,
  getScoreFidelity,
} from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const attempts = await prisma.testAttempt.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        test: { select: { title: true } },
        moduleResults: {
          include: {
            module: { include: { section: { select: { type: true } } } },
          },
        },
      },
    });

    const headers = [
      "Student Name",
      "Student Email",
      "Test Title",
      "Date Completed",
      "Total Score",
      "Reading & Writing Score",
      "Math Score",
      "Score Fidelity",
    ];

    const rows = attempts.map((a) => {
      const liveResults = a.moduleResults.filter(
        (r) => r.module && r.module.section,
      );
      const moduleResults = liveResults.map((r) => ({
        sectionType: r.module.section.type,
        correctCount: r.correctCount,
        totalCount: r.totalCount,
        moduleId: r.moduleId,
        routedTo: r.routedTo,
        moduleNumber: r.module.moduleNumber,
        difficulty: r.module.difficulty,
      }));
      const raw = computeRawScores(moduleResults);
      const scaled = computeScaledScores(raw, computeAttemptRoutes(moduleResults));
      const scoreFidelity = getScoreFidelity(raw);
      const hasScore = scoreFidelity !== "INCOMPLETE";

      return [
        a.user?.name ?? "anonymous",
        a.user?.email ?? "",
        a.test.title,
        a.completedAt ? a.completedAt.toISOString() : "",
        hasScore ? scaled.total.toString() : "",
        hasScore ? scaled.readingWriting.toString() : "",
        hasScore ? scaled.math.toString() : "",
        scoreFidelity,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if there's a comma or quote
            const escaped = String(cell).replace(/"/g, '""');
            if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")) {
              return `"${escaped}"`;
            }
            return escaped;
          })
          .join(","),
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="attempts_export.csv"',
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
