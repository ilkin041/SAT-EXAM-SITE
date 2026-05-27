import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tests", label: "Tests" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm font-semibold">
              SAT Admin
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
            <DarkModeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-input px-3 py-1.5 hover:bg-accent"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="container mx-auto max-w-6xl py-8">{children}</div>
    </div>
  );
}
