import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, LockKeyhole, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Free SAT practice sample",
  description: "Try a public Digital SAT-style practice test without creating an account.",
  path: "/practice",
  og: { eyebrow: "Free sample" },
});

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const tests = await prisma.test.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          modules: { include: { _count: { select: { moduleQuestions: true } } } },
        },
      },
    },
  });

  const readyTests = tests.filter((test) =>
    test.sections.length > 0 &&
    test.sections.every(
      (section) =>
        section.modules.length > 0 &&
        section.modules.every((module) => module._count.moduleQuestions > 0),
    ),
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* T3.1: the shared chrome replaces the lone "← Back home" link. */}
      <MarketingHeader />

      <main className="container mx-auto max-w-5xl px-4 py-14">
        <header className="max-w-3xl">
          <Badge variant="info">Free sample</Badge>
          <h1 className="mt-4 text-display">
            Experience the test before creating an account
          </h1>
          <p className="mt-4 text-body-lg text-muted-foreground">
            Take a timed public practice test in the same interface used by enrolled students.
            Your anonymous session is bound to this browser with a signed, HTTP-only cookie.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Feature icon={Clock} title="Server-timed" text="Closing the tab does not pause a module deadline." />
          <Feature icon={ShieldCheck} title="Private session" text="The attempt ID alone cannot open or modify your sample." />
          <Feature icon={LockKeyhole} title="One browser" text="Starting another anonymous sample replaces the current browser binding." />
        </section>

        <section className="mt-12">
          <h2 className="text-h3">Available samples</h2>
          {readyTests.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={BookOpen} title="No sample is ready" description="A public test will appear here after all of its modules contain questions." />
            </div>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {readyTests.map((test) => {
                const servedQuestions = test.sections.reduce((total, section) => {
                  const module1 = section.modules.find((module) => module.moduleNumber === 1)?._count.moduleQuestions ?? 0;
                  const module2 = Math.max(
                    0,
                    ...section.modules
                      .filter((module) => module.moduleNumber === 2)
                      .map((module) => module._count.moduleQuestions),
                  );
                  return total + module1 + module2;
                }, 0);
                const minutes = Math.round(
                  test.sections.reduce(
                    (total, section) => total + section.module1TimeLimit + section.module2TimeLimit,
                    0,
                  ) / 60,
                );
                return (
                  <article key={test.id} className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={test.mode === "ADAPTIVE" ? "purple" : "muted"}>{test.mode}</Badge>
                      <span className="text-caption text-muted-foreground">~{minutes} min</span>
                    </div>
                    <h3 className="mt-4 text-h3">{test.title}</h3>
                    {test.description && <p className="mt-2 line-clamp-3 text-body text-muted-foreground">{test.description}</p>}
                    <p className="mt-4 text-caption text-muted-foreground">{servedQuestions} questions served across {test.sections.length} sections</p>
                    <Button asChild className="mt-5 w-full">
                      <Link href={`/test/${test.id}/start`}>
                        View sample details <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-10 text-body text-muted-foreground">
          Want saved progress across devices and access to assigned private tests?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">Create an account</Link>.
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-4">
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
