import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ----- Header ----- */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            SAT Practice
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>
                  Go to {user.role === "ADMIN" ? "admin" : "dashboard"}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ----- Hero ----- */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="container mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" aria-hidden />
              Bluebook-style practice platform
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Digital SAT Practice,{" "}
              <span className="text-primary">Built for Your Students</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Full-length adaptive practice tests with the same format as the real exam.
              Detailed scoring, domain breakdowns, and an answer-review interface students
              actually want to use.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Sign Up Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>

          {/* Decorative test-card mockup */}
          <div className="relative hidden lg:block">
            <MockTestCard />
          </div>
        </div>
      </section>

      {/* ----- Features ----- */}
      <section className="border-b border-border/60 bg-card/40">
        <div className="container mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Everything you need</h2>
            <p className="mt-3 text-muted-foreground">
              A focused, distraction-free testing interface backed by the tooling a tutor needs.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Feature
              icon={LayoutGrid}
              title="Adaptive Testing"
              description="Module 2 difficulty routes from Module 1 performance — exactly how the real Digital SAT works."
            />
            <Feature
              icon={BookOpenCheck}
              title="Full Question Bank"
              description="Build your own library of math and reading-and-writing questions, then assign them across tests."
            />
            <Feature
              icon={BarChart3}
              title="Detailed Results"
              description="200–800 scaled scores per section, total out of 1600, and a per-domain breakdown of every attempt."
            />
          </div>
        </div>
      </section>

      {/* ----- How it works ----- */}
      <section className="border-b border-border/60">
        <div className="container mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <p className="mt-3 text-muted-foreground">
              Three steps from sign-up to your first scored attempt.
            </p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            <Step
              n={1}
              icon={UserPlus}
              title="Sign up and log in"
              description="Free account creation. Admin users can also be set up to manage tests."
            />
            <Step
              n={2}
              icon={ListChecks}
              title="Choose a practice test"
              description="Pick from your library of full-length or section-only practice tests."
            />
            <Step
              n={3}
              icon={BarChart3}
              title="Get your score and review"
              description="See your scaled score and walk through every question with explanations."
            />
          </ol>
        </div>
      </section>

      {/* ----- Footer ----- */}
      <footer className="mt-auto border-t border-border/60 py-8">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden />
            <span className="font-medium text-foreground">SAT Practice</span>
            <span>— Built for SAT preparation.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">Log in</Link>
            <Link href="/signup" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card transition-shadow duration-150 hover:shadow-elevated">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  description,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <li className="relative rounded-xl border border-border bg-card p-6 shadow-card">
      <span className="absolute -top-3 left-6 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
        {n}
      </span>
      <div className="mt-2 flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </li>
  );
}

/**
 * Decorative card showing a stylized "question" — pure CSS, no real data.
 * Sits at the right of the hero on large screens.
 */
function MockTestCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Soft glow */}
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-primary/10 blur-2xl" aria-hidden />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Module 1 · Math
          </div>
          <div className="rounded-md bg-foreground/5 px-2 py-1 font-mono text-[11px] tabular-nums text-foreground">
            32:18
          </div>
        </div>
        <div className="p-6">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Question 14 of 22
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            If <span className="font-mono">3x + 2 = 17</span>, what is the value of{" "}
            <span className="font-mono">x</span>?
          </p>
          <div className="mt-5 space-y-2">
            {["A", "B", "C", "D"].map((letter, i) => (
              <div
                key={letter}
                className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  i === 1
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium ${
                    i === 1 ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {letter}
                </span>
                <span>
                  {["3", "5", "7", "15"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            type="button"
            disabled
            className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            Back
          </button>
          <button
            type="button"
            disabled
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
