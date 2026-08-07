"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableCaption,
  TableEmpty,
  TableSkeleton,
  TBody,
  TD,
  TH,
  THead,
  TR,
  type HideBelow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * DataTable — search, filters, sortable columns and paging over `Table` (T1.4).
 *
 * **Where the work happens is a prop, not a fork.** `mode="client"` takes the
 * whole dataset and filters, sorts and slices it in the browser; `mode="server"`
 * takes one page of rows plus a `total` and does none of that, because the
 * server already did. Both modes drive the *same* four URL params, so the two
 * are swappable without a call site changing anything but the prop — which is
 * what lets `/admin/questions` keep its 100-per-page server query while a
 * 30-row admin list stays client-side.
 *
 * **State lives in the URL, not in this component.** `?q=`, `?sort=`, `?dir=`
 * and `?page=` are the source of truth, so a filtered table survives a reload,
 * a back button, and being pasted into a colleague's chat. A server page reads
 * the same keys out of `searchParams`; {@link dataTableParams} names them so
 * neither side has to hardcode the strings. Two tables on one page need
 * different `paramPrefix` values.
 *
 * Navigation is `router.replace(…, { scroll: false })` inside a transition:
 * typing in the search box must not push twenty history entries, and a table
 * two screens down must not yank the page to the top when it re-sorts.
 */

export type Column<T> = {
  /** Identifies the column in `?sort=`. Stable across renders. */
  key: string;
  /** Header text. Empty string for an actions column — set `srHeader` too. */
  header: string;
  /** Mono tabular figures, right-aligned, in both header and cells. */
  numeric?: boolean;
  sortable?: boolean;
  /** CSS width for the column, e.g. `"12rem"` or `"25%"`. */
  width?: string;
  /** Drops the column below this breakpoint, header and cells together. */
  hideBelow?: HideBelow;
  cell: (row: T) => React.ReactNode;
  /**
   * Client mode: the comparable value behind this column. Without it the
   * column sorts on the text its `cell` renders, which is right for a plain
   * string cell and wrong for a badge, a date, or "1,240" — supply it whenever
   * the visible text is not the thing you mean to order by.
   */
  sortValue?: (row: T) => string | number | null | undefined;
  /**
   * Client mode: the text the search box matches on. Defaults to the text the
   * `cell` renders.
   */
  searchValue?: (row: T) => string;
  /** Accessible header when `header` is empty. */
  srHeader?: string;
};

type SortDir = "asc" | "desc";

export interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  /** Client mode: every row. Server mode: the current page only. */
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => React.Key;
  /** Where filtering, sorting and paging happen. Defaults to `"client"`. */
  mode?: "client" | "server";
  pageSize?: number;
  /** Server mode only, and required there: rows across every page. */
  total?: number;
  /** Renders the search box. Pass an object to change the placeholder. */
  search?: boolean | { placeholder?: string };
  /** Filter controls — `Select`s, usually. Sits to the right of the search box. */
  filters?: React.ReactNode;
  loading?: boolean;
  stickyHeader?: boolean;
  caption?: React.ReactNode;
  defaultSort?: { key: string; dir?: SortDir };
  /** Shown when there are no rows at all. A filtered-to-nothing table gets its
   *  own message with a "Clear filters" action instead. */
  empty?: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  /** Noun for the result count and the empty message: "questions", "attempts". */
  itemNoun?: string;
  /** Disambiguates the URL params when a page carries two tables. */
  paramPrefix?: string;
  className?: string;
}

/**
 * The URL params a `DataTable` reads and writes. Server pages should read these
 * out of `searchParams` rather than spelling the keys out again.
 */
export function dataTableParams(paramPrefix = "") {
  return {
    q: `${paramPrefix}q`,
    sort: `${paramPrefix}sort`,
    dir: `${paramPrefix}dir`,
    page: `${paramPrefix}page`,
  } as const;
}

/**
 * `useSearchParams` opts its whole subtree into client-side rendering, and Next
 * fails the build on a page that prerenders one without a boundary. Owning the
 * Suspense here means no call site has to remember.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  return (
    <React.Suspense fallback={<DataTableFallback {...props} />}>
      <DataTableInner {...props} />
    </React.Suspense>
  );
}

function DataTableFallback<T>({
  columns,
  pageSize = 25,
  stickyHeader,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full min-w-0 space-y-4", className)}>
      <Table stickyHeader={stickyHeader}>
        <HeaderRow columns={columns} sort={undefined} onSort={undefined} />
        <TableSkeleton columns={columns} rows={Math.min(pageSize, 8)} />
      </Table>
    </div>
  );
}

function DataTableInner<T>({
  columns,
  rows,
  rowKey,
  mode = "client",
  pageSize = 25,
  total,
  search,
  filters,
  loading = false,
  stickyHeader,
  caption,
  defaultSort,
  empty,
  itemNoun = "results",
  paramPrefix = "",
  className,
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const names = React.useMemo(() => dataTableParams(paramPrefix), [paramPrefix]);

  const query = searchParams.get(names.q) ?? "";
  const sortKey = searchParams.get(names.sort) ?? defaultSort?.key;
  const sortDir: SortDir =
    searchParams.get(names.dir) === "desc"
      ? "desc"
      : searchParams.get(names.dir) === "asc"
        ? "asc"
        : (defaultSort?.dir ?? "asc");
  const requestedPage = Math.max(
    1,
    Number.parseInt(searchParams.get(names.page) ?? "1", 10) || 1,
  );

  const setParams = React.useCallback(
    (next: Partial<Record<"q" | "sort" | "dir" | "page", string | undefined>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [name, value] of Object.entries(next)) {
        const param = names[name as keyof typeof names];
        if (value === undefined || value === "") params.delete(param);
        else params.set(param, value);
      }
      const queryString = params.toString();
      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      });
    },
    [names, pathname, router, searchParams],
  );

  // ---- search box -------------------------------------------------------
  // Typed characters land here immediately and reach the URL 300ms later, so
  // the input never waits on a round trip and server mode never fires a query
  // per keystroke.
  const [draft, setDraft] = React.useState(query);
  React.useEffect(() => setDraft(query), [query]);
  React.useEffect(() => {
    if (draft === query) return;
    const timer = setTimeout(
      () => setParams({ q: draft || undefined, page: undefined }),
      300,
    );
    return () => clearTimeout(timer);
  }, [draft, query, setParams]);

  // ---- client-mode filter / sort / slice ---------------------------------
  const isServer = mode === "server";

  const filtered = React.useMemo(() => {
    if (isServer || !query) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) =>
      columns.some((column) => columnText(column, row).toLowerCase().includes(needle)),
    );
  }, [columns, isServer, query, rows]);

  const sorted = React.useMemo(() => {
    if (isServer || !sortKey) return filtered;
    const column = columns.find((c) => c.key === sortKey && c.sortable);
    if (!column) return filtered;
    const factor = sortDir === "desc" ? -1 : 1;
    // Copied before sorting: `rows` is the caller's array.
    return [...filtered].sort((a, b) => factor * compareRows(column, a, b));
  }, [columns, filtered, isServer, sortDir, sortKey]);

  const resultCount = isServer ? (total ?? rows.length) : sorted.length;
  const totalPages = Math.max(1, Math.ceil(resultCount / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const pageRows = isServer
    ? rows
    : sorted.slice((page - 1) * pageSize, page * pageSize);

  const hasQuery = query.length > 0;
  const showsNothing = pageRows.length === 0;
  // "Nothing here yet" and "nothing matched" are different messages. In server
  // mode the component only ever sees one page, so the query is the only signal
  // available — which is the right one.
  const filteredToNothing = showsNothing && hasQuery;

  const handleSort = React.useCallback(
    (column: Column<T>) => {
      const nextDir: SortDir =
        sortKey === column.key && sortDir === "asc" ? "desc" : "asc";
      setParams({ sort: column.key, dir: nextDir, page: undefined });
    },
    [setParams, sortDir, sortKey],
  );

  const goToPage = React.useCallback(
    (next: number) => setParams({ page: next <= 1 ? undefined : String(next) }),
    [setParams],
  );

  const searchPlaceholder =
    (typeof search === "object" ? search.placeholder : undefined) ??
    `Search ${itemNoun}…`;

  const busy = loading || isPending;
  const from = resultCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = isServer
    ? Math.min(page * pageSize, resultCount)
    : (page - 1) * pageSize + pageRows.length;

  return (
    <div className={cn("w-full min-w-0 space-y-4", className)}>
      {(search || filters) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {search && (
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {filters && (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {filters}
            </div>
          )}
        </div>
      )}

      <Table stickyHeader={stickyHeader} aria-busy={busy || undefined}>
        {caption && <TableCaption>{caption}</TableCaption>}
        <HeaderRow
          columns={columns}
          sort={sortKey ? { key: sortKey, dir: sortDir } : undefined}
          onSort={handleSort}
        />
        {loading ? (
          <TableSkeleton columns={columns} rows={Math.min(pageSize, 8)} />
        ) : (
          <TBody>
            {showsNothing ? (
              filteredToNothing ? (
                <TableEmpty
                  colSpan={columns.length}
                  icon={Search}
                  title={`No ${itemNoun} match “${query}”`}
                  description="Try a shorter search, or clear it to see everything."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => setParams({ q: undefined, page: undefined })}
                    >
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <TableEmpty
                  colSpan={columns.length}
                  icon={empty?.icon}
                  title={empty?.title ?? `No ${itemNoun} yet`}
                  description={empty?.description}
                  action={empty?.action}
                />
              )
            ) : (
              pageRows.map((row) => (
                <TR key={rowKey(row)}>
                  {columns.map((column) => (
                    <TD
                      key={column.key}
                      numeric={column.numeric}
                      hideBelow={column.hideBelow}
                    >
                      {column.cell(row)}
                    </TD>
                  ))}
                </TR>
              ))
            )}
          </TBody>
        )}
      </Table>

      {!showsNothing && (
        <nav
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          aria-label={`${itemNoun} pagination`}
        >
          <p className="text-caption text-muted-foreground" aria-live="polite">
            <span className="tabular">
              {from}–{to}
            </span>{" "}
            of <span className="tabular">{resultCount}</span> {itemNoun}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
              </Button>
              <span className="px-1 text-caption text-muted-foreground">
                Page <span className="tabular">{page}</span> of{" "}
                <span className="tabular">{totalPages}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}

function HeaderRow<T>({
  columns,
  sort,
  onSort,
}: {
  columns: ReadonlyArray<Column<T>>;
  sort: { key: string; dir: SortDir } | undefined;
  onSort: ((column: Column<T>) => void) | undefined;
}) {
  return (
    <THead>
      <TR>
        {columns.map((column) => {
          const activeSort = sort?.key === column.key ? sort : undefined;
          const SortIcon = !activeSort
            ? ChevronsUpDown
            : activeSort.dir === "asc"
              ? ArrowUp
              : ArrowDown;

          return (
            <TH
              key={column.key}
              numeric={column.numeric}
              hideBelow={column.hideBelow}
              style={column.width ? { width: column.width } : undefined}
              aria-sort={
                column.sortable
                  ? activeSort
                    ? activeSort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined
              }
            >
              {column.sortable && onSort ? (
                // A real button, so it is tabbable, Enter/Space-operable and
                // wears the global :focus-visible ring. `-mx-1 px-1` keeps the
                // ring off the text without shifting the column.
                <button
                  type="button"
                  onClick={() => onSort(column)}
                  className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:text-foreground"
                >
                  {column.header || column.srHeader}
                  <SortIcon
                    className={cn("h-3 w-3", !activeSort && "opacity-50")}
                    aria-hidden
                  />
                </button>
              ) : column.header ? (
                column.header
              ) : (
                <span className="sr-only">{column.srHeader ?? "Actions"}</span>
              )}
            </TH>
          );
        })}
      </TR>
    </THead>
  );
}

/** Flattens a rendered cell to the text a reader would see. */
function toText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join(" ");
  if (React.isValidElement(node)) {
    return toText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

function columnText<T>(column: Column<T>, row: T): string {
  return column.searchValue?.(row) ?? toText(column.cell(row));
}

function compareRows<T>(column: Column<T>, a: T, b: T): number {
  const left = sortableValue(column, a);
  const right = sortableValue(column, b);

  // Blanks sort last in either direction would need a second pass; they sort
  // first ascending, which at least keeps them together.
  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortableValue<T>(column: Column<T>, row: T): string | number | null {
  if (column.sortValue) {
    const value = column.sortValue(row);
    return value === undefined || value === "" ? null : value;
  }
  const text = toText(column.cell(row)).trim();
  if (!text) return null;
  if (column.numeric) {
    // "1,240" and "72%" are numbers wearing punctuation.
    const parsed = Number.parseFloat(text.replace(/[^0-9.-]/g, ""));
    return Number.isNaN(parsed) ? text : parsed;
  }
  return text;
}
