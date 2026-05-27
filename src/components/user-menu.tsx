"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  name: string | null | undefined;
  email: string | null | undefined;
}

/**
 * User pill in the top-right of the student nav. Shows an avatar circle with
 * the first letter of the user's name (or email), the display name, and a
 * dropdown chevron. Opens a small menu with a sign-out item.
 */
export function UserMenu({ name, email }: Props) {
  const display = name?.trim() || email || "Account";
  const initial = (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
  const [signing, setSigning] = useState(false);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "group flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 text-sm transition-colors duration-150",
          "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        aria-label="Open account menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initial}
        </span>
        <span className="hidden max-w-[160px] truncate text-xs font-medium text-foreground sm:inline">
          {display}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 min-w-[200px] rounded-lg border border-border bg-card p-1 shadow-elevated",
            "data-[state=open]:animate-fade-in",
          )}
        >
          <div className="px-3 py-2 text-xs">
            <div className="truncate font-medium text-foreground">{display}</div>
            {name && email && (
              <div className="truncate text-muted-foreground">{email}</div>
            )}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            disabled={signing}
            onSelect={(e) => {
              e.preventDefault();
              setSigning(true);
              void signOut({ callbackUrl: "/" });
            }}
            className={cn(
              "flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 text-sm outline-none",
              "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
              "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signing ? "Signing out…" : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
