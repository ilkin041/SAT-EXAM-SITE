import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TestsTable, type TestRow } from "./_components/tests-table";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Tests — Admin", path: "/admin/tests", noindex: true });

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "ADAPTIVE" || sp.mode === "LINEAR" ? sp.mode : undefined;
  const visibility =
    sp.visibility === "public" || sp.visibility === "private" ? sp.visibility : undefined;

  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { attempts: true } },
      sections: {
        include: {
          modules: { include: { _count: { select: { moduleQuestions: true } } } },
        },
      },
    },
  });

  const rows: TestRow[] = tests.map((test) => ({
    id: test.id,
    title: test.title,
    mode: test.mode,
    isPublic: test.isPublic,
    questionCount: test.sections
      .flatMap((section) => section.modules)
      .reduce((sum, module) => sum + module._count.moduleQuestions, 0),
    attemptCount: test._count.attempts,
    created: formatDate(test.createdAt),
    createdAtMs: test.createdAt.getTime(),
  }));

  return (
    <>
      <PageHeader
        title="Tests"
        description="Manage your practice tests, sections, and modules."
        actions={
          <Button asChild>
            <Link href="/admin/tests/new">
              <Plus className="h-4 w-4" />
              New test
            </Link>
          </Button>
        }
      />

      <div className="animate-fade-in">
        <TestsTable rows={rows} mode={mode} visibility={visibility} />
      </div>
    </>
  );
}
