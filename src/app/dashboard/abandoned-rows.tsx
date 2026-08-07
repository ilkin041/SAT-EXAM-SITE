"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapses abandoned attempts behind a disclosure row inside the history
 * table. The rows themselves are rendered on the server and passed through as
 * `children` — this island owns nothing but the open/closed state.
 *
 * It renders `<tr>`s, so it must be placed directly inside a `<tbody>`.
 */
export function AbandonedRows({
  count,
  columnCount,
  children,
}: {
  count: number;
  columnCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr>
        <td colSpan={columnCount} className="p-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center gap-2 px-6 py-3 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
            {open
              ? `Hide ${count} abandoned attempt${count === 1 ? "" : "s"}`
              : `Show ${count} abandoned attempt${count === 1 ? "" : "s"}`}
          </button>
        </td>
      </tr>
      {open && children}
    </>
  );
}
