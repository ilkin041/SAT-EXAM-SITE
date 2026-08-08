/**
 * The controlled vocabulary for `Question.domainId` / `Question.skillId` (T2.2).
 *
 * This file is the *seed*; the `Domain` and `Skill` tables are the runtime
 * source of truth, because a tutor can add a skill from the admin form and that
 * row will not appear here. `npm run db:seed-taxonomy` pushes this file into
 * those tables and is safe to re-run; `tests/question-taxonomy.test.ts` pins the
 * invariants that make the ids stable.
 *
 * **Ids are hand-written slugs, not cuids.** They appear in a migration, in the
 * seed, in the import fixtures and in `?skill=` URLs, and all four want the same
 * string on a fresh database as on this one.
 *
 * A skill belongs to exactly one domain — that is College Board's model and it
 * is what lets `SkillMastery` (T8.1) roll a skill up to a domain without a
 * second join. `Words in Context` is a Craft and Structure skill even when a
 * question tagged with it was filed under Information and Ideas; the T2.2
 * migration treats the *domain* as authoritative and sends that disagreement to
 * the review list rather than re-domaining a question, because
 * `computeDomainBreakdown` reads `Question.domain` live and moving one would
 * silently rewrite the score report of every historical attempt containing it.
 */

export type QuestionSectionType = "READING_WRITING" | "MATH";

export interface SkillSpec {
  id: string;
  name: string;
}

export interface DomainSpec {
  id: string;
  name: string;
  sectionType: QuestionSectionType;
  skills: readonly SkillSpec[];
}

export const TAXONOMY: readonly DomainSpec[] = [
  {
    id: "info-ideas",
    name: "Information and Ideas",
    sectionType: "READING_WRITING",
    skills: [
      { id: "info-ideas-central", name: "Central Ideas and Details" },
      { id: "info-ideas-evidence", name: "Command of Evidence" },
      { id: "info-ideas-inferences", name: "Inferences" },
    ],
  },
  {
    id: "craft-structure",
    name: "Craft and Structure",
    sectionType: "READING_WRITING",
    skills: [
      { id: "craft-words", name: "Words in Context" },
      { id: "craft-text-structure-purpose", name: "Text Structure and Purpose" },
      { id: "craft-cross-text", name: "Cross-Text Connections" },
    ],
  },
  {
    id: "expression-ideas",
    name: "Expression of Ideas",
    sectionType: "READING_WRITING",
    skills: [
      { id: "expression-synthesis", name: "Rhetorical Synthesis" },
      { id: "expression-transitions", name: "Transitions" },
    ],
  },
  {
    id: "standard-english",
    name: "Standard English Conventions",
    sectionType: "READING_WRITING",
    skills: [
      { id: "standard-boundaries", name: "Boundaries" },
      { id: "standard-form-structure-sense", name: "Form, Structure, and Sense" },
    ],
  },
  {
    id: "algebra",
    name: "Algebra",
    sectionType: "MATH",
    skills: [
      { id: "algebra-linear-equations-one-variable", name: "Linear equations in one variable" },
      { id: "algebra-linear-equations-two-variables", name: "Linear equations in two variables" },
      { id: "algebra-linear-functions", name: "Linear functions" },
      {
        id: "algebra-systems-two-linear-equations",
        name: "Systems of two linear equations in two variables",
      },
      {
        id: "algebra-linear-inequalities",
        name: "Linear inequalities in one or two variables",
      },
    ],
  },
  {
    id: "advanced-math",
    name: "Advanced Math",
    sectionType: "MATH",
    skills: [
      { id: "advanced-equivalent-expressions", name: "Equivalent expressions" },
      {
        id: "advanced-nonlinear-equations",
        name: "Nonlinear equations in one variable and systems of equations in two variables",
      },
      { id: "advanced-nonlinear-functions", name: "Nonlinear functions" },
    ],
  },
  {
    id: "problem-solving-data-analysis",
    name: "Problem-Solving and Data Analysis",
    sectionType: "MATH",
    skills: [
      {
        id: "psda-ratios-rates-units",
        name: "Ratios, rates, proportional relationships, and units",
      },
      { id: "psda-percentages", name: "Percentages" },
      {
        id: "psda-one-variable-data",
        name: "One-variable data: distributions and measures of center and spread",
      },
      { id: "psda-two-variable-data", name: "Two-variable data: models and scatterplots" },
      { id: "psda-probability", name: "Probability and conditional probability" },
      { id: "psda-inference", name: "Inference from sample statistics and margin of error" },
      {
        id: "psda-statistical-claims",
        name: "Evaluating statistical claims: observational studies and experiments",
      },
    ],
  },
  {
    id: "geometry-trigonometry",
    name: "Geometry and Trigonometry",
    sectionType: "MATH",
    skills: [
      { id: "geometry-area-volume", name: "Area and volume" },
      { id: "geometry-lines-angles-triangles", name: "Lines, angles, and triangles" },
      { id: "geometry-right-triangles-trigonometry", name: "Right triangles and trigonometry" },
      { id: "geometry-circles", name: "Circles" },
    ],
  },
] as const;

/**
 * Collapse everything a human would consider cosmetic, so that a legacy value
 * differing only by case, punctuation, hyphenation, spacing or plurality lands
 * on the same key. `"Right Triangles"` and `"right triangle"` both fold to
 * `"right triangle"`.
 *
 * The de-pluralisation is deliberately crude — it only strips a trailing `s`
 * from words longer than three characters — because it never has to be *right*,
 * only *consistent*: both sides of every lookup go through this function.
 */
export function foldTaxonomyName(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[‐-―]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word))
    .join(" ");
}

/**
 * Legacy free-text skill values seen in the bank before T2.2, mapped onto the
 * canonical skill they mean. Keys are written as they were authored and matched
 * through `foldTaxonomyName`, so a case or punctuation variant of any key
 * resolves without its own entry — and a legacy value that already folds onto a
 * canonical *name* needs no entry at all.
 *
 * A value that is genuinely ambiguous is deliberately absent. `"Data Analysis"`
 * spans four PSDA skills and `"Functions"` spans three; guessing one would put
 * a fabricated tag under T8.1's mastery model, so those questions go to the
 * review list with their original string preserved instead.
 */
const LEGACY_SKILL_ALIASES: Readonly<Record<string, string>> = {
  // Reading and Writing
  "Text Purpose": "craft-text-structure-purpose",
  "Text Structure": "craft-text-structure-purpose",

  // Algebra
  "Interpreting linear expressions": "algebra-linear-functions",
  "Isolating quantities": "algebra-linear-equations-one-variable",
  "Linear equations with fractions": "algebra-linear-equations-one-variable",
  "Linear inequalities": "algebra-linear-inequalities",
  "Linear inequalities in one variable": "algebra-linear-inequalities",
  "Linear models": "algebra-linear-functions",
  "Systems of linear equations": "algebra-systems-two-linear-equations",
  "Systems of linear inequalities": "algebra-linear-inequalities",

  // Advanced Math
  "Evaluating functions from graphs": "advanced-nonlinear-functions",
  "Exponential functions": "advanced-nonlinear-functions",
  "Exponential models": "advanced-nonlinear-functions",
  "Interpreting nonlinear expressions": "advanced-equivalent-expressions",
  "Nonlinear equations": "advanced-nonlinear-equations",
  "Nonlinear equations in one variable": "advanced-nonlinear-equations",
  "Nonlinear equations in two variables": "advanced-nonlinear-equations",
  "Quadratic equations": "advanced-nonlinear-equations",
  "Quadratic functions": "advanced-nonlinear-functions",

  // Problem-Solving and Data Analysis
  "Center, spread, and shape of distributions": "psda-one-variable-data",
  "Data inferences": "psda-inference",
  "Inference from sample statistics": "psda-inference",
  "Inference from sample surveys and experiments": "psda-statistical-claims",
  Probability: "psda-probability",
  "Rates, ratios, and proportions": "psda-ratios-rates-units",
  "Ratios, rates, and proportions": "psda-ratios-rates-units",
  Scatterplots: "psda-two-variable-data",
  "Units and rates": "psda-ratios-rates-units",

  // Geometry and Trigonometry
  Area: "geometry-area-volume",
  "Area and perimeter": "geometry-area-volume",
  Volume: "geometry-area-volume",
  "Volume of cylinders, cones, and spheres": "geometry-area-volume",
  "Circles in the coordinate plane": "geometry-circles",
  "Right triangles": "geometry-right-triangles-trigonometry",
  "Triangles and trigonometric ratios": "geometry-right-triangles-trigonometry",
};

// ---------- Derived lookups ----------

export const ALL_DOMAIN_SPECS = TAXONOMY;
export const ALL_SKILL_SPECS: readonly (SkillSpec & { domainId: string })[] = TAXONOMY.flatMap(
  (domain) => domain.skills.map((skill) => ({ ...skill, domainId: domain.id })),
);

/** Domain *names* per section — what a `Select` renders. */
export const QUESTION_DOMAINS: Record<QuestionSectionType, readonly string[]> = {
  READING_WRITING: TAXONOMY.filter((d) => d.sectionType === "READING_WRITING").map((d) => d.name),
  MATH: TAXONOMY.filter((d) => d.sectionType === "MATH").map((d) => d.name),
};

export const ALL_QUESTION_DOMAINS: readonly string[] = TAXONOMY.map((d) => d.name);

const DOMAIN_BY_ID = new Map(TAXONOMY.map((d) => [d.id, d]));
const SKILL_BY_ID = new Map(ALL_SKILL_SPECS.map((s) => [s.id, s]));

const DOMAIN_BY_FOLD = new Map(TAXONOMY.map((d) => [foldTaxonomyName(d.name), d]));
/** Extra spellings of a domain that predate the canonical name. */
for (const [alias, id] of Object.entries({
  Geometry: "geometry-trigonometry",
  "Problem solving and data analysis": "problem-solving-data-analysis",
})) {
  DOMAIN_BY_FOLD.set(foldTaxonomyName(alias), DOMAIN_BY_ID.get(id)!);
}

/**
 * Canonical names first, then the legacy aliases. A canonical name always wins:
 * an alias that folds onto one would be a typo in the table above, and the
 * assertion below turns that into a startup failure rather than a silent
 * remapping.
 */
const SKILL_BY_FOLD = new Map<string, SkillSpec & { domainId: string }>(
  ALL_SKILL_SPECS.map((skill) => [foldTaxonomyName(skill.name), skill]),
);
for (const [alias, skillId] of Object.entries(LEGACY_SKILL_ALIASES)) {
  const key = foldTaxonomyName(alias);
  const target = SKILL_BY_ID.get(skillId);
  if (!target) {
    throw new Error(`Skill alias "${alias}" points at unknown skill id "${skillId}"`);
  }
  const existing = SKILL_BY_FOLD.get(key);
  if (existing && existing.id !== skillId) {
    throw new Error(
      `Skill alias "${alias}" folds to "${key}", which already resolves to "${existing.id}"`,
    );
  }
  SKILL_BY_FOLD.set(key, target);
}

// ---------- Resolution ----------

export function domainSpecById(id: string): DomainSpec | null {
  return DOMAIN_BY_ID.get(id) ?? null;
}

export function skillSpecById(id: string): (SkillSpec & { domainId: string }) | null {
  return SKILL_BY_ID.get(id) ?? null;
}

/** Resolve a free-text domain name — canonical, cased differently, or a known alias. */
export function resolveDomain(value: string): DomainSpec | null {
  return DOMAIN_BY_FOLD.get(foldTaxonomyName(value)) ?? null;
}

/**
 * Resolve a free-text skill name to its canonical spec, ignoring which domain
 * the caller thinks it is in. Returns `null` for a value with no canonical
 * meaning — the caller decides whether that is a review-list entry (migration)
 * or a rejection (import).
 */
export function resolveSkill(value: string): (SkillSpec & { domainId: string }) | null {
  return SKILL_BY_FOLD.get(foldTaxonomyName(value)) ?? null;
}

/** Canonical domain *name* for a free-text value, or null. Kept for callers that want a string. */
export function normalizeQuestionDomain(value: string): string | null {
  return resolveDomain(value)?.name ?? null;
}

export function isDomainForSection(domain: string, sectionType: QuestionSectionType): boolean {
  const spec = resolveDomain(domain);
  return spec !== null && spec.sectionType === sectionType;
}

/** The skills a given domain offers, in authoring order. */
export function skillsForDomain(domainId: string): readonly SkillSpec[] {
  return DOMAIN_BY_ID.get(domainId)?.skills ?? [];
}

/**
 * Turn a proposed new skill name into the id it would get. Same shape as the
 * seeded ids — `<domainId>-<slug>` — so an admin-created skill is
 * indistinguishable from a seeded one in a URL or an export.
 */
export function skillIdFor(domainId: string, name: string): string {
  const slug = name
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${domainId}-${slug}`;
}
