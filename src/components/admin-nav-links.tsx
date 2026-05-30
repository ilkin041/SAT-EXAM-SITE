"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tests", label: "Tests" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/attempts", label: "Attempts" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/groups", label: "Groups" },
];

/**
 * Pill-tab navigation inside the AdminNav header. Active tab is white on the
 * navy bar; inactive tabs are translucent white with a hover lift.
 *
 * Lives in its own client island because we need `usePathname()` for the
 * active state — the rest of AdminNav stays server-rendered.
 */
export function AdminNavLinks() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav className="flex items-center gap-1 text-xs">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 font-semibold transition-all duration-150 active-press hover-lift",
              active
                ? "bg-white text-brand-navy shadow-sm font-bold"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
