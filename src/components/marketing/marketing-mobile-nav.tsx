"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MarketingNavItem } from "@/lib/marketing-nav";

/**
 * Mobile half of the marketing header: a trigger below `md`, opening the nav in
 * a right-edge `Sheet`.
 *
 * Controlled rather than uncontrolled because every link has to close it — an
 * in-page anchor scrolls the document behind a panel that Radix has locked, so
 * a nav that stays open after a tap looks like it did nothing. The auth actions
 * live in here too: below `sm` the header drops them to keep the bar from
 * wrapping at 360px, and this is where they go instead.
 */
export function MarketingMobileNav({
  items,
  signedIn,
  dashboardHref,
  dashboardLabel,
}: {
  items: readonly MarketingNavItem[];
  signedIn: boolean;
  dashboardHref: string;
  dashboardLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" title="Menu" className="sm:max-w-sm">
        <SheetBody>
          {items.length > 0 && (
            <nav aria-label="Main" className="flex flex-col">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={close}
                  className="rounded-lg px-3 py-3 text-body-lg font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
            {signedIn ? (
              <Button asChild onClick={close}>
                <Link href={dashboardHref}>{dashboardLabel}</Link>
              </Button>
            ) : (
              <>
                <Button asChild onClick={close}>
                  <Link href="/signup">Sign up</Link>
                </Button>
                <Button asChild variant="secondary" onClick={close}>
                  <Link href="/login">Log in</Link>
                </Button>
              </>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
