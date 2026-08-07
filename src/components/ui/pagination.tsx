"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Pagination — page numbers, prev/next, page size and the result range (T1.6).
 *
 * **The URL is the state.** `?page=` and `?perPage=` are written on every
 * interaction, so a page of results survives a reload and can be pasted to
 * someone else. That is the same contract `DataTable` (T1.4) has, and
 * deliberately the same `page` param name, so a server page reads one key
 * whichever component is driving. {@link paginationParams} names them; two
 * pagers on one page need different `paramPrefix` values.
 *
 * Pass `onPageChange` to take that over — the component then touches no URL and
 * the caller owns the number. Both halves work that way independently, so a
 * URL-driven page count can sit next to a caller-owned page size.
 *
 * **Buttons, not links.** A page number that is an `<a href>` would open in a
 * new tab, which is genuinely better — but only the URL-synced half could have
 * one, and a control that is a link here and a button there is worse than
 * either. The URL still updates, so the address bar is still shareable.
 *
 * Renders nothing at all when `total` is 0: an empty result set gets an
 * `EmptyState`, not a pager saying "0–0 of 0".
 */

/**
 * The URL params a `Pagination` reads and writes. Server pages should read
 * these out of `searchParams` rather than spelling the keys out again.
 */
export function paginationParams(paramPrefix = "") {
  return {
    page: `${paramPrefix}page`,
    perPage: `${paramPrefix}perPage`,
  } as const;
}

export interface PaginationProps {
  /** Rows across every page. */
  total: number;
  /** Rows per page when the URL says nothing. Also the fallback for a
   *  `?perPage=` that is not one of `pageSizeOptions`. */
  pageSize?: number;
  /** Renders the size selector. One option (or none) renders no selector. */
  pageSizeOptions?: readonly number[];
  /** Noun for the range line and the accessible name: "questions". */
  itemNoun?: string;
  /** Page numbers either side of the current one. */
  siblingCount?: number;
  /** Disambiguates the URL params when a page carries two pagers. */
  paramPrefix?: string;
  /** Controlled page. Overrides `?page=`. */
  page?: number;
  /** Takes over paging: the component stops writing `?page=`. */
  onPageChange?: (page: number) => void;
  /** Takes over sizing: the component stops writing `?perPage=`. */
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

/**
 * `useSearchParams` opts its whole subtree into client-side rendering, and Next
 * fails the build on a page that prerenders one without a boundary. Owning the
 * Suspense here means no call site has to remember.
 */
export function Pagination(props: PaginationProps) {
  return (
    <React.Suspense fallback={null}>
      <PaginationInner {...props} />
    </React.Suspense>
  );
}

function PaginationInner({
  total,
  pageSize = 25,
  pageSizeOptions,
  itemNoun = "results",
  siblingCount = 1,
  paramPrefix = "",
  page: pageProp,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = React.useTransition();

  const names = React.useMemo(
    () => paginationParams(paramPrefix),
    [paramPrefix],
  );

  const setParams = React.useCallback(
    (next: Partial<Record<"page" | "perPage", string | undefined>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [name, value] of Object.entries(next)) {
        const param = names[name as keyof typeof names];
        if (value === undefined) params.delete(param);
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

  // A `?perPage=` nobody offered is ignored rather than honoured: the param is
  // user-editable and a query for 100,000 rows is one keystroke away.
  const urlSize = Number.parseInt(searchParams.get(names.perPage) ?? "", 10);
  const size =
    pageSizeOptions?.includes(urlSize) && !onPageSizeChange ? urlSize : pageSize;

  const totalPages = Math.max(1, Math.ceil(total / size));
  const requested =
    pageProp ??
    Math.max(1, Number.parseInt(searchParams.get(names.page) ?? "1", 10) || 1);
  const page = Math.min(Math.max(1, requested), totalPages);

  const goToPage = React.useCallback(
    (next: number) => {
      if (onPageChange) {
        onPageChange(next);
        return;
      }
      setParams({ page: next <= 1 ? undefined : String(next) });
    },
    [onPageChange, setParams],
  );

  const changeSize = React.useCallback(
    (next: number) => {
      // Page 1 either way: page 7 of a 25-row list is page 2 of a 100-row one,
      // and silently landing somewhere else is worse than starting over.
      if (onPageSizeChange) {
        onPageSizeChange(next);
        return;
      }
      setParams({
        perPage: next === pageSize ? undefined : String(next),
        page: undefined,
      });
    },
    [onPageSizeChange, pageSize, setParams],
  );

  if (total <= 0) return null;

  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const items = pageItems(page, totalPages, siblingCount);
  const showSizes = (pageSizeOptions?.length ?? 0) > 1;

  return (
    <nav
      aria-label={`${itemNoun} pagination`}
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-caption text-muted-foreground" aria-live="polite">
        Showing{" "}
        <span className="tabular">
          {format(from)}–{format(to)}
        </span>{" "}
        of <span className="tabular">{format(total)}</span> {itemNoun}
      </p>

      <div className="flex items-center gap-3">
        {showSizes && (
          <Select
            value={String(size)}
            onValueChange={(value) => changeSize(Number(value))}
            className="w-auto"
          >
            <SelectTrigger
              size="sm"
              aria-label={`${itemNoun} per page`}
              className="w-auto gap-1.5"
            >
              <span className="tabular">{size}</span>{" "}
              <span className="text-muted-foreground">per page</span>
            </SelectTrigger>
            <SelectContent className="w-auto min-w-0">
              {pageSizeOptions?.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  <span className="tabular">{option}</span> per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {totalPages > 1 && (
          <ul className="flex items-center gap-1">
            <li>
              <PageButton
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </PageButton>
            </li>

            {items.map((item, index) =>
              item === "gap" ? (
                <li
                  key={`gap-${index}`}
                  aria-hidden
                  className="px-1 text-caption text-muted-foreground"
                >
                  …
                </li>
              ) : (
                <li key={item}>
                  <PageButton
                    onClick={() => goToPage(item)}
                    current={item === page}
                    aria-label={`Page ${item}`}
                  >
                    <span className="tabular">{item}</span>
                  </PageButton>
                </li>
              ),
            )}

            <li>
              <PageButton
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </PageButton>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}

function PageButton({
  current,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { current?: boolean }) {
  return (
    <button
      type="button"
      // `aria-current` rather than `aria-selected` or a disabled button: the
      // current page stays pressable, so a reader who lands on it can confirm
      // where they are without the control disappearing from the tab order.
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-caption transition-colors",
        current
          ? "border-primary bg-primary font-semibold text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The page numbers to render, with `"gap"` where a run was elided. First and
 * last are always present, so the ends stay one click away at any page count.
 *
 * A gap that hides exactly one number is not a gap — `1 … 3 4 5` costs the same
 * width as `1 2 3 4 5` and tells the reader less, so a single-page jump is
 * filled in instead.
 */
export function pageItems(
  page: number,
  totalPages: number,
  siblingCount = 1,
): (number | "gap")[] {
  // The elided layout is at most `first + gap + window + gap + last` slots
  // wide. At or under that, listing every page costs no more room and asks the
  // reader to guess nothing.
  const widest = 2 * siblingCount + 5;
  if (totalPages <= widest) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const wanted = new Set<number>([1, totalPages]);
  for (let p = page - siblingCount; p <= page + siblingCount; p++) {
    if (p >= 1 && p <= totalPages) wanted.add(p);
  }

  const items: (number | "gap")[] = [];
  let previous = 0;
  for (const current of [...wanted].sort((a, b) => a - b)) {
    if (current - previous === 2) items.push(previous + 1);
    else if (current - previous > 2) items.push("gap");
    items.push(current);
    previous = current;
  }
  return items;
}

/** Fixed locale: the server and the browser must agree on the separator, and
 *  the runtime default is whatever the machine says. */
const numberFormat = new Intl.NumberFormat("en-US");
const format = (value: number) => numberFormat.format(value);
