import { Shield } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/auth";
import { AdminNavLinks } from "@/components/admin-nav-links";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

interface Props {
  email: string;
}

/**
 * Sticky admin header — full navy bar with logo, pill-tab navigation, the
 * admin badge with current user, dark-mode toggle, and sign-out button.
 *
 * Server component; offloads only the active-link logic to the client via
 * <AdminNavLinks />.
 */
export function AdminNav({ email }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-brand-navy text-white shadow-sm">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            SAT Admin
          </Link>
          <AdminNavLinks />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
            <span className="text-xs text-white/70">{email}</span>
          </div>
          <DarkModeToggle />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
