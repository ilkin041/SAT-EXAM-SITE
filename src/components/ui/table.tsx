import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/**
 * Table — the shared markup for the 13 hand-rolled tables (T1.4).
 *
 * Presentational only, and deliberately not a client component: an admin list
 * page is a server component and should stay one. `DataTable` is the client
 * layer that adds search, sort and paging on top of these.
 *
 * Two structural decisions are worth knowing before you restyle anything here.
 *
 * **1. `border-separate`, not `border-collapse`.** The collapsing border model
 * hands ownership of every border to the table itself, and a `position: sticky`
 * cell is painted out of flow — so a collapsed table's sticky header loses its
 * bottom border the moment it detaches. Separate borders keep it. The cost is
 * that `<tr>` can no longer carry a border at all, which is why the row rules
 * live on the cells (`TD` draws its own `border-b`) rather than on a `divide-y`
 * over the rows. The result is what `divide-y` looks like; the mechanism has to
 * differ.
 *
 * **2. `stickyHeader` bounds the scroll container.** The header sticks inside
 * the nearest scrolling ancestor, and `Table` always wraps itself in one —
 * `overflow-x-auto` is what keeps a wide table off the page's horizontal
 * scrollbar at 360px, and CSS computes the other axis to `auto` alongside it.
 * An unbounded wrapper therefore has a scrollport that starts exactly where the
 * header already is, and the header appears never to move. So `stickyHeader`
 * also caps the wrapper at `max-h-[70vh]`: the table scrolls within the page
 * rather than with it, and the header stays put. Pass `containerClassName` to
 * choose a different cap — `max-h-96`, `max-h-[32rem]` — it wins over the
 * default through `twMerge`.
 */

export type HideBelow = "sm" | "md" | "lg";

/**
 * `hidden sm:table-cell` and friends. Written out rather than interpolated
 * because Tailwind only sees class names that appear whole in the source.
 */
function hideBelowClass(hideBelow?: HideBelow): string {
  switch (hideBelow) {
    case "sm":
      return "hidden sm:table-cell";
    case "md":
      return "hidden md:table-cell";
    case "lg":
      return "hidden lg:table-cell";
    default:
      return "";
  }
}

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Pins the header row and caps the scroll container at 70vh. */
  stickyHeader?: boolean;
  /** Applied to the scroll wrapper — this is the layout box, not the table. */
  containerClassName?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ stickyHeader, containerClassName, className, ...props }, ref) => (
    <div
      className={cn(
        // `min-w-0` is load-bearing, not defensive: dropped into a flex or grid
        // parent this box would take `min-width: auto`, size itself to the
        // table's content, and put a nine-column table on the *page's*
        // horizontal scrollbar instead of its own.
        "w-full min-w-0 overflow-auto rounded-xl border border-border bg-card",
        stickyHeader && "max-h-[70vh]",
        containerClassName,
      )}
    >
      <table
        ref={ref}
        className={cn(
          "w-full border-separate border-spacing-0 text-body",
          // Every header cell, not the <thead>: Safari has never supported a
          // sticky thead, and sticking the cells works everywhere.
          stickyHeader && "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

export const THead = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("text-left", className)} {...props} />
));
THead.displayName = "THead";

export const TBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      // Hover lives here rather than on TR so the header row cannot pick it up,
      // and so a hand-written <tr> inside a TBody still behaves like a row.
      "[&>tr]:transition-colors [&>tr:hover]:bg-muted/40",
      // The last row's rule would double up with the container's own border.
      "[&>tr:last-child>td]:border-b-0 [&>tr:last-child>th]:border-b-0",
      className,
    )}
    {...props}
  />
));
TBody.displayName = "TBody";

export const TR = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn(className)} {...props} />
));
TR.displayName = "TR";

export interface THProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-aligns the column. Pair with `numeric` on the matching `TD`. */
  numeric?: boolean;
  /** Drops the column below this breakpoint. Must match the matching `TD`. */
  hideBelow?: HideBelow;
}

export const TH = React.forwardRef<HTMLTableCellElement, THProps>(
  ({ className, numeric, hideBelow, ...props }, ref) => (
    <th
      ref={ref}
      scope="col"
      className={cn(
        // `bg-muted` is opaque on purpose: a translucent header would show the
        // rows sliding underneath it once it sticks.
        "eyebrow border-b border-border bg-muted px-4 py-3 text-muted-foreground",
        numeric && "text-right",
        hideBelowClass(hideBelow),
        className,
      )}
      {...props}
    />
  ),
);
TH.displayName = "TH";

export interface TDProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Mono, tabular figures, right-aligned — every number in a table. */
  numeric?: boolean;
  /** Drops the column below this breakpoint. Must match the matching `TH`. */
  hideBelow?: HideBelow;
}

export const TD = React.forwardRef<HTMLTableCellElement, TDProps>(
  ({ className, numeric, hideBelow, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "border-b border-border/60 px-4 py-3 align-middle",
        numeric && "tabular text-right",
        hideBelowClass(hideBelow),
        className,
      )}
      {...props}
    />
  ),
);
TD.displayName = "TD";

/**
 * Sits below the table (`caption-side: bottom`) so it never fights the sticky
 * header for the top edge. Use it for the provenance a header cannot carry —
 * "Updated hourly", "Excludes abandoned attempts".
 */
export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "caption-bottom border-t border-border/60 px-4 py-3 text-left text-caption text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export interface TableEmptyProps {
  /** Must span every column, including the ones `hideBelow` may have dropped. */
  colSpan: number;
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * The empty row. Renders `EmptyState` inside a full-width cell with its own
 * border and gradient sheet stripped, so the table's frame stays the only one.
 */
export function TableEmpty({
  colSpan,
  icon,
  title,
  description,
  action,
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={action}
          className="rounded-none border-0 bg-none bg-transparent py-12"
        />
      </td>
    </tr>
  );
}

export interface TableSkeletonProps {
  /**
   * Column count, or the columns themselves — passing the columns keeps the
   * placeholder honest about which ones `hideBelow` has dropped.
   */
  columns: number | ReadonlyArray<{ hideBelow?: HideBelow; numeric?: boolean }>;
  rows?: number;
}

/**
 * A `<tbody>` of shimmer bars. Widths cycle through four values so the block
 * reads as text rather than a bar chart; the global `prefers-reduced-motion`
 * rule in `globals.css` stops the pulse.
 */
export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  const spec =
    typeof columns === "number"
      ? Array.from({ length: columns }, () => ({}) as { hideBelow?: HideBelow })
      : columns;
  const widths = ["w-full", "w-3/4", "w-1/2", "w-2/3"];

  return (
    <TBody aria-hidden>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TR key={rowIndex}>
          {spec.map((column, columnIndex) => (
            <TD key={columnIndex} hideBelow={column.hideBelow}>
              <span
                className={cn(
                  "block h-4 animate-pulse rounded bg-muted",
                  widths[(rowIndex + columnIndex) % widths.length],
                )}
              />
            </TD>
          ))}
        </TR>
      ))}
    </TBody>
  );
}
