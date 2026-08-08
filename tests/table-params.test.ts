import { describe, expect, it } from "vitest";
import {
  dataTableParams,
  orderByFrom,
  readTableParams,
} from "@/lib/table-params";

/**
 * The URL contract between `DataTable` and the server pages behind it (T1.9).
 *
 * `orderByFrom` is the one with teeth: `?sort=` is user-editable text on its
 * way into a Prisma `orderBy`, and the whitelist is the only thing standing
 * between a hand-edited query string and the query builder.
 */

describe("dataTableParams", () => {
  it("names the four params, unprefixed by default", () => {
    expect(dataTableParams()).toEqual({
      q: "q",
      sort: "sort",
      dir: "dir",
      page: "page",
    });
  });

  it("keeps two tables on one page apart", () => {
    // The group detail page runs exactly this pair.
    expect(dataTableParams("s").q).toBe("sq");
    expect(dataTableParams("t").q).toBe("tq");
    expect(dataTableParams("s").page).not.toBe(dataTableParams("t").page);
  });
});

describe("readTableParams", () => {
  it("reads a full query", () => {
    const params = readTableParams({
      q: " linear equations ",
      sort: "domain",
      dir: "desc",
      page: "3",
    });
    expect(params.q).toBe("linear equations");
    expect(params.sort).toBe("domain");
    expect(params.dir).toBe("desc");
    expect(params.page).toBe(3);
    expect(params.skip(25)).toBe(50);
  });

  it("defaults an absent query to page 1, ascending, no sort", () => {
    const params = readTableParams({});
    expect(params.q).toBe("");
    expect(params.sort).toBeUndefined();
    // Ascending matches `DataTable`, which sorts up on a header's first click.
    expect(params.dir).toBe("asc");
    expect(params.page).toBe(1);
    expect(params.skip(25)).toBe(0);
  });

  it("clamps a nonsense page rather than sending it to skip", () => {
    // `skip: -50` is a Prisma error, and `?page=0` is one keystroke away.
    expect(readTableParams({ page: "0" }).page).toBe(1);
    expect(readTableParams({ page: "-4" }).page).toBe(1);
    expect(readTableParams({ page: "banana" }).page).toBe(1);
    expect(readTableParams({ page: "" }).page).toBe(1);
  });

  it("treats any dir that is not desc as asc", () => {
    expect(readTableParams({ dir: "DESC" }).dir).toBe("asc");
    expect(readTableParams({ dir: "sideways" }).dir).toBe("asc");
    expect(readTableParams({ dir: "desc" }).dir).toBe("desc");
  });

  it("takes the first value when a param is repeated", () => {
    // `?sort=a&sort=b` arrives as an array, and a Prisma orderBy wants one key.
    expect(readTableParams({ sort: ["domain", "stem"] }).sort).toBe("domain");
    expect(readTableParams({ page: ["2", "9"] }).page).toBe(2);
  });

  it("reads a prefixed table without touching the unprefixed one", () => {
    const searchParams = { q: "outer", sq: "inner", spage: "4" };
    expect(readTableParams(searchParams).q).toBe("outer");
    expect(readTableParams(searchParams, "s").q).toBe("inner");
    expect(readTableParams(searchParams, "s").page).toBe(4);
    expect(readTableParams(searchParams).page).toBe(1);
  });

  it("treats an empty sort as no sort, so the caller's default wins", () => {
    expect(readTableParams({ sort: "" }).sort).toBeUndefined();
  });
});

describe("orderByFrom", () => {
  // Annotated, not inferred: without the annotation `T` latches onto the first
  // entry's return type and the second stops assigning. The real call sites are
  // annotated the same way, with Prisma's `…OrderByWithRelationInput`.
  const orderings: Record<
    string,
    (dir: "asc" | "desc") => Record<string, "asc" | "desc">
  > = {
    name: (dir) => ({ name: dir }),
    joined: (dir) => ({ createdAt: dir }),
  };

  it("builds the requested ordering", () => {
    expect(orderByFrom("name", "desc", orderings, "joined")).toEqual({
      name: "desc",
    });
  });

  it("falls back when the key is absent", () => {
    expect(orderByFrom(undefined, "asc", orderings, "joined")).toEqual({
      createdAt: "asc",
    });
  });

  it("refuses a key that is not on the whitelist", () => {
    // The point of the whitelist: an arbitrary `?sort=` never reaches Prisma.
    expect(orderByFrom("password", "asc", orderings, "joined")).toEqual({
      createdAt: "asc",
    });
    expect(orderByFrom("__proto__", "asc", orderings, "joined")).toEqual({
      createdAt: "asc",
    });
    expect(orderByFrom("constructor", "asc", orderings, "joined")).toEqual({
      createdAt: "asc",
    });
  });
});
