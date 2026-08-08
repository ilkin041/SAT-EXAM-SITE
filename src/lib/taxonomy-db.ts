import { prisma } from "@/lib/prisma";
import {
  foldTaxonomyName,
  resolveDomain,
  resolveSkill,
  skillIdFor,
  type QuestionSectionType,
} from "@/lib/question-taxonomy";

/**
 * Name → id resolution for the controlled vocabulary (T2.2).
 *
 * **This module imports `prisma`. It is server-only — never import it from a
 * client component.** The pure name-matching lives in `question-taxonomy.ts`,
 * which is safe on both sides; a client island that needs the vocabulary takes
 * it as a prop.
 *
 * **The database is the source of truth, not `question-taxonomy.ts`.** That
 * file seeds the tables, but a tutor can add a skill through the admin form and
 * that row exists only in `Skill`. So every resolver here reads the tables and
 * falls back to the static aliases only to *interpret* a name — never to decide
 * that one exists.
 *
 * Resolution is two-stage, which matters for the error messages: a name is
 * first matched exactly, then through `foldTaxonomyName`, so `"linear
 * functions"` and `"Linear Functions"` both find the canonical row instead of
 * being rejected as unknown. That is the whole point of the migration — the
 * bank is not allowed to grow a second spelling of a skill it already has.
 */

export interface DomainRow {
  id: string;
  name: string;
  sectionType: QuestionSectionType;
  sortOrder: number;
}

export interface SkillRow {
  id: string;
  domainId: string;
  name: string;
  sortOrder: number;
}

export interface TaxonomyTables {
  domains: DomainRow[];
  skills: SkillRow[];
}

/**
 * Every domain and skill, ordered for display. Not cached: the tables hold 8
 * and ~29 rows, and a stale cache after "Add skill" is a worse bug than the
 * query it saves.
 */
export async function loadTaxonomy(): Promise<TaxonomyTables> {
  const [domains, skills] = await Promise.all([
    prisma.domain.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.skill.findMany({ orderBy: [{ domainId: "asc" }, { sortOrder: "asc" }] }),
  ]);
  return {
    domains: domains.map((d) => ({
      id: d.id,
      name: d.name,
      sectionType: d.sectionType as QuestionSectionType,
      sortOrder: d.sortOrder,
    })),
    skills,
  };
}

export type ResolveResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Resolve a domain name to its row. Accepts the canonical spelling, any case or
 * punctuation variant, and the two pre-T2.2 aliases (`Geometry`, `Problem
 * solving and data analysis`).
 */
export function resolveDomainRow(
  tables: TaxonomyTables,
  name: string,
  sectionType?: QuestionSectionType,
): ResolveResult<DomainRow> {
  const folded = foldTaxonomyName(name);
  const spec = resolveDomain(name);
  const row =
    tables.domains.find((d) => d.id === spec?.id) ??
    tables.domains.find((d) => foldTaxonomyName(d.name) === folded);

  if (!row) {
    const offered = tables.domains
      .filter((d) => !sectionType || d.sectionType === sectionType)
      .map((d) => d.name);
    return {
      ok: false,
      error: `Unknown domain "${name}". Use one of: ${offered.join(", ")}.`,
    };
  }
  if (sectionType && row.sectionType !== sectionType) {
    return {
      ok: false,
      error: `Domain "${row.name}" belongs to ${row.sectionType === "MATH" ? "Math" : "Reading and Writing"}, not ${sectionType === "MATH" ? "Math" : "Reading and Writing"}.`,
    };
  }
  return { ok: true, value: row };
}

/**
 * Resolve a skill name *within a domain*. A skill belongs to exactly one
 * domain, so a name that exists under a different one is rejected with that
 * fact rather than "unknown" — the two mistakes need different fixes, and this
 * is the exact class of error the migration sent 17 questions to review for.
 */
export function resolveSkillRow(
  tables: TaxonomyTables,
  domain: DomainRow,
  name: string,
): ResolveResult<SkillRow> {
  const folded = foldTaxonomyName(name);
  const inDomain = tables.skills.filter((s) => s.domainId === domain.id);

  const direct =
    inDomain.find((s) => s.name === name) ??
    inDomain.find((s) => foldTaxonomyName(s.name) === folded);
  if (direct) return { ok: true, value: direct };

  // A legacy spelling that the static alias table knows about.
  const alias = resolveSkill(name);
  if (alias) {
    const aliased = tables.skills.find((s) => s.id === alias.id);
    if (aliased && aliased.domainId === domain.id) return { ok: true, value: aliased };
    if (aliased) {
      const owner = tables.domains.find((d) => d.id === aliased.domainId);
      return {
        ok: false,
        error: `Skill "${name}" belongs to ${owner?.name ?? aliased.domainId}, not ${domain.name}. Either change the domain or pick one of: ${inDomain.map((s) => s.name).join(", ")}.`,
      };
    }
  }

  // Present under another domain under its own name.
  const elsewhere = tables.skills.find(
    (s) => foldTaxonomyName(s.name) === folded && s.domainId !== domain.id,
  );
  if (elsewhere) {
    const owner = tables.domains.find((d) => d.id === elsewhere.domainId);
    return {
      ok: false,
      error: `Skill "${name}" belongs to ${owner?.name ?? elsewhere.domainId}, not ${domain.name}. Either change the domain or pick one of: ${inDomain.map((s) => s.name).join(", ")}.`,
    };
  }

  return {
    ok: false,
    error: `Unknown skill "${name}" for ${domain.name}. Valid skills are: ${inDomain.map((s) => s.name).join(", ")}. Add it in the question editor first if it is genuinely new.`,
  };
}

/**
 * Create a skill under a domain, or return the existing row when the name is
 * already taken under any spelling. This is the *only* way a new skill enters
 * the vocabulary — it is what keeps "add a skill" from being a free-text write.
 */
export async function createSkillRow(
  domainId: string,
  rawName: string,
): Promise<ResolveResult<SkillRow>> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2) return { ok: false, error: "A skill name needs at least two characters." };
  if (name.length > 120) return { ok: false, error: "A skill name must be 120 characters or fewer." };

  const tables = await loadTaxonomy();
  const domain = tables.domains.find((d) => d.id === domainId);
  if (!domain) return { ok: false, error: "Unknown domain." };

  // Fold-match rather than exact-match, so "Linear Models" cannot join a
  // vocabulary that already has "Linear models".
  const folded = foldTaxonomyName(name);
  const clash = tables.skills.find((s) => foldTaxonomyName(s.name) === folded);
  if (clash) {
    if (clash.domainId === domainId) return { ok: true, value: clash };
    const owner = tables.domains.find((d) => d.id === clash.domainId);
    return {
      ok: false,
      error: `"${clash.name}" already exists under ${owner?.name ?? clash.domainId}. A skill belongs to one domain.`,
    };
  }

  const maxOrder = tables.skills
    .filter((s) => s.domainId === domainId)
    .reduce((max, s) => Math.max(max, s.sortOrder), -1);

  // Same `<domainId>-<slug>` shape as the seeded ids, so an admin-created skill
  // is indistinguishable from a seeded one in a URL or an export. A collision
  // means two names slugged the same; suffix rather than fail.
  let id = skillIdFor(domainId, name);
  if (tables.skills.some((s) => s.id === id)) id = `${id}-${tables.skills.length + 1}`;

  const created = await prisma.skill.create({
    data: { id, domainId, name, sortOrder: maxOrder + 1 },
  });
  return { ok: true, value: created };
}
