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
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-gradient-to-r from-brand-navy via-[#1e305e] to-brand-navy text-white shadow-md">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 text-sm font-bold text-white transition-all duration-150 active:scale-[0.98]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            <span className="tracking-tight">SAT Admin</span>
          </Link>
          <AdminNavLinks />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
              Admin
            </span>
            <span className="text-xs text-white/70 font-medium">{email}</span>
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
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/90 transition-all duration-150 hover:bg-white/10 hover:text-white active:scale-95"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
