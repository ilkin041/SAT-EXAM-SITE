/**
 * The URL contract shared by `DataTable` and the server pages that feed it
 * (T1.9).
 *
 * **This lives outside `data-table.tsx` for a reason that will bite otherwise.**
 * Every export of a `"use client"` module — functions included — becomes a
 * client *reference* when a Server Component imports it: an opaque marker the
 * bundler swaps in, not the function. `dataTableParams` was written to be read
 * from `searchParams` on the server, so calling the client copy there would
 * throw at request time rather than at build time. Keeping it in a plain module
 * lets both sides call the same function. `data-table.tsx` re-exports it for
 * client call sites; a server page must import it from here.
 */

export type SortDir = "asc" | "desc";

/**
 * The four params a `DataTable` reads and writes. Two tables on one page need
 * different `paramPrefix` values.
 */
export function dataTableParams(paramPrefix = "") {
  return {
    q: `${paramPrefix}q`,
    sort: `${paramPrefix}sort`,
    dir: `${paramPrefix}dir`,
    page: `${paramPrefix}page`,
  } as const;
}

export interface TableParams {
  /** Trimmed search text. `""` when absent — never `undefined`. */
  q: string;
  /** The requested column key, or `undefined` to let the caller's default win. */
  sort: string | undefined;
  dir: SortDir;
  /** One-based, clamped to at least 1. */
  page: number;
  /** `skip` for a Prisma query at this page size. */
  skip: (pageSize: number) => number;
}

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Reads a page's `searchParams` into the shape a Prisma query wants.
 *
 * `dir` defaults to `"asc"` to match `DataTable`, which sorts ascending on a
 * column's first click.
 */
export function readTableParams(
  searchParams: RawParams,
  paramPrefix = "",
): TableParams {
  const names = dataTableParams(paramPrefix);
  const page = Math.max(
    1,
    Number.parseInt(one(searchParams[names.page]) ?? "1", 10) || 1,
  );
  return {
    q: (one(searchParams[names.q]) ?? "").trim(),
    sort: one(searchParams[names.sort]) || undefined,
    dir: one(searchParams[names.dir]) === "desc" ? "desc" : "asc",
    page,
    skip: (pageSize: number) => (page - 1) * pageSize,
  };
}

/**
 * Maps `?sort=` onto one of the orderings the caller is willing to run.
 *
 * The whitelist is the point: `?sort=` is user-editable text heading for a
 * Prisma `orderBy`, and an unknown key has to fall back rather than reach the
 * query. `dir` is applied by the caller's builder so a compound ordering
 * ("score desc, then name asc") stays expressible.
 *
 * The lookup is `hasOwnProperty`, not `orderings[sort]`. A plain object literal
 * still inherits from `Object.prototype`, so `?sort=constructor` finds a
 * truthy value that is not one of the orderings — and `?sort=__proto__` finds
 * an object that is not callable at all. Both crashed the page before
 * `tests/table-params.test.ts` went looking.
 */
export function orderByFrom<T>(
  sort: string | undefined,
  dir: SortDir,
  orderings: Record<string, (dir: SortDir) => T>,
  fallback: string,
): T {
  const key =
    sort && Object.prototype.hasOwnProperty.call(orderings, sort)
      ? sort
      : fallback;
  return orderings[key](dir);
}
