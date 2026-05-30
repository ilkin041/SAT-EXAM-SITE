import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DuplicateTestButton } from "./_components/duplicate-test-button";

export const metadata = { title: "Tests — Admin" };

export default async function TestsPage() {
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

      {tests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No tests yet"
          description="Create your first practice test to get started."
          action={
            <Button asChild className="bg-gradient-primary text-white border-transparent hover:opacity-95 hover:glow-primary active-press transition-all duration-200">
              <Link href="/admin/tests/new">
                <Plus className="h-4 w-4" />
                Create test
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold">Title</th>
                  <th className="px-6 py-4 font-semibold">Mode</th>
                  <th className="px-6 py-4 font-semibold">Visibility</th>
                  <th className="px-6 py-4 text-center font-semibold">Questions</th>
                  <th className="px-6 py-4 text-center font-semibold">Attempts</th>
                  <th className="px-6 py-4 font-semibold">Created</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tests.map((t) => {
                  const totalQ = t.sections
                    .flatMap((s) => s.modules)
                    .reduce((sum, m) => sum + m._count.moduleQuestions, 0);
                  return (
                    <tr key={t.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <Link
                          href={`/admin/tests/${t.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={t.mode === "ADAPTIVE" ? "purple" : "info"}>
                          {t.mode}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={t.isPublic ? "success" : "outline"}>
                          {t.isPublic ? "Public" : "Private"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center tabular-nums text-muted-foreground font-medium">
                        {totalQ}
                      </td>
                      <td className="px-6 py-4 text-center tabular-nums text-muted-foreground font-medium">
                        {t._count.attempts}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {t.createdAt.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <DuplicateTestButton testId={t.id} originalTitle={t.title} />
                          <Button asChild variant="secondary" size="sm" className="hover-lift active-press shadow-xs">
                            <Link href={`/admin/tests/${t.id}`}>Open</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
