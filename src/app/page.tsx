import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Sparkles,
  Target,
  UserPlus,
  Zap,
} from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ----- Header ----- */}
      <header className="sticky top-0 z-50 border-b border-border/40 glass">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
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
      <section className="relative overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 animated-gradient-bg" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />

        {/* Decorative blurred orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" aria-hidden />

        <div className="container relative mx-auto grid max-w-6xl gap-12 px-4 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            {/* Pill badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Bluebook-style practice platform
            </span>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Digital SAT Practice,{" "}
              <span className="text-gradient-primary">
                Built for Your Students
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Full-length adaptive practice tests with the same format as the real exam.
              Detailed scoring, domain breakdowns, and an answer-review interface students
              actually want to use.
            </p>

            {/* Quick highlights */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                Timed modules
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                200–800 scoring
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                Free to use
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/signup">
                  Sign Up Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
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

      {/* ----- Stats banner ----- */}
      <section className="border-y border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="container mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4">
          {[
            { value: "1600", label: "Max SAT Score", icon: Target },
            { value: "236+", label: "Practice Questions", icon: BookOpenCheck },
            { value: "4", label: "Full-Length Tests", icon: LayoutGrid },
            { value: "∞", label: "Free Attempts", icon: Zap },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <stat.icon className="mb-2 h-5 w-5 text-primary/70" aria-hidden />
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </div>
              <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----- Features ----- */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="container relative mx-auto max-w-6xl px-4 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              Features
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-3 text-muted-foreground">
              A focused, distraction-free testing interface backed by the tooling a tutor needs.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Feature
              icon={LayoutGrid}
              title="Adaptive Testing"
              description="Module 2 difficulty routes from Module 1 performance — exactly how the real Digital SAT works."
              gradient="from-blue-500/10 to-indigo-500/10"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <Feature
              icon={BookOpenCheck}
              title="Full Question Bank"
              description="Build your own library of math and reading-and-writing questions, then assign them across tests."
              gradient="from-violet-500/10 to-purple-500/10"
              iconColor="text-violet-600 dark:text-violet-400"
            />
            <Feature
              icon={BarChart3}
              title="Detailed Results"
              description="200–800 scaled scores per section, total out of 1600, and a per-domain breakdown of every attempt."
              gradient="from-emerald-500/10 to-teal-500/10"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>
      </section>

      {/* ----- How it works ----- */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="container mx-auto max-w-6xl px-4 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              How it works
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Three easy steps
            </h2>
            <p className="mt-3 text-muted-foreground">
              From sign-up to your first scored attempt in minutes.
            </p>
          </div>

          {/* Steps with connecting line */}
          <div className="relative mt-14">
            {/* Connecting gradient line (desktop) */}
            <div
              className="pointer-events-none absolute left-0 right-0 top-10 hidden h-[2px] md:block"
              style={{
                background: "linear-gradient(90deg, transparent 10%, hsl(var(--primary) / 0.2) 20%, hsl(var(--primary) / 0.2) 80%, transparent 90%)",
              }}
              aria-hidden
            />

            <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
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
        </div>
      </section>

      {/* ----- CTA banner ----- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" aria-hidden />
        <div className="container relative mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to boost your SAT score?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join students already practicing with full-length, timed practice tests.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ----- Footer ----- */}
      <footer className="mt-auto border-t border-border/40">
        {/* Gradient accent line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), hsl(var(--ring) / 0.2), transparent)",
          }}
          aria-hidden
        />
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="font-semibold text-foreground">SAT Practice</span>
            <span className="text-xs text-muted-foreground">— Built for SAT preparation.</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/login" className="transition-colors hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================================
 * Sub-components
 * ========================================================================= */

function Feature({
  icon: Icon,
  title,
  description,
  gradient,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-1">
      {/* Gradient background wash */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden
      />

      <div className="relative">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} ${iconColor} shadow-sm`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="mt-5 text-base font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
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
    <li className="group relative rounded-2xl border border-border/60 bg-card p-7 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-1">
      {/* Step number badge with glow */}
      <div className="absolute -top-3.5 left-7">
        <span className="relative inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 px-2.5 text-xs font-bold text-primary-foreground shadow-md">
          {n}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </div>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </li>
  );
}

/**
 * Decorative card showing a stylized "question" — pure CSS, no real data.
 * Sits at the right of the hero on large screens. Floats gently.
 */
function MockTestCard() {
  return (
    <div className="relative mx-auto w-full max-w-md animate-float">
      {/* Multi-layer glow */}
      <div className="absolute -inset-8 -z-10 rounded-3xl bg-primary/8 blur-2xl" aria-hidden />
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-violet-500/5 blur-xl" aria-hidden />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated-lg">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
            Module 1 · Math
          </div>
          <div className="rounded-lg bg-foreground/5 px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums text-foreground">
            32:18
          </div>
        </div>

        {/* Question body */}
        <div className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question 14 of 22
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            If <span className="rounded bg-muted/50 px-1 font-mono text-xs">3x + 2 = 17</span>, what is the value of{" "}
            <span className="rounded bg-muted/50 px-1 font-mono text-xs">x</span>?
          </p>
          <div className="mt-5 space-y-2">
            {["A", "B", "C", "D"].map((letter, i) => (
              <div
                key={letter}
                className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-all duration-200 ${
                  i === 1
                    ? "border-primary/50 bg-primary/5 text-foreground shadow-sm"
                    : "border-border/60 text-muted-foreground hover:border-border"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                    i === 1
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/60"
                  }`}
                >
                  {letter}
                </span>
                <span>{["3", "5", "7", "15"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
          <button
            type="button"
            disabled
            className="rounded-lg border border-input bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm"
          >
            Back
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
