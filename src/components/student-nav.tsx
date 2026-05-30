import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { auth } from "@/auth";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { UserMenu } from "@/components/user-menu";

/**
 * Sticky top navigation for student-facing pages (dashboard, results, etc.).
 * The user pill is a client island so it can host a Radix dropdown; the rest
 * of the bar is server-rendered.
 */
export async function StudentNav() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 glass shadow-sm">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 text-sm font-bold text-foreground transition-all duration-150 hover:text-primary active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
            <GraduationCap className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="tracking-tight animate-fade-in">SAT Practice</span>
        </Link>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          {user ? (
            <UserMenu name={user.name ?? null} email={user.email ?? null} />
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
