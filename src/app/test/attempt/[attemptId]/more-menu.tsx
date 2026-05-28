"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { BookOpen, Keyboard, MoreVertical } from "lucide-react";

interface Props {
  onShowDirections: () => void;
  onShowShortcuts: () => void;
}

/**
 * Three-dot "More" button in the test TopBar. Mirrors the look of the
 * existing IconLabel buttons (icon + label, square hit area) so it blends
 * in with the rest of the toolbar.
 */
export function MoreMenu({ onShowDirections, onShowShortcuts }: Props) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-12 w-12 flex-col items-center justify-center rounded-md text-neutral-700 transition-colors hover:bg-neutral-200"
          title="More"
        >
          <MoreVertical className="h-5 w-5" aria-hidden />
          <span className="mt-0.5 text-[10px] font-medium leading-none">More</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[200px] rounded-lg border border-border bg-card p-1 shadow-elevated data-[state=open]:animate-fade-in"
        >
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onShowDirections();
            }}
            className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            Directions
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onShowShortcuts();
            }}
            className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
          >
            <Keyboard className="h-4 w-4" aria-hidden />
            Keyboard shortcuts
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
