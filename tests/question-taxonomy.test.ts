import { describe, expect, it } from "vitest";
import {
  ALL_QUESTION_DOMAINS,
  ALL_SKILL_SPECS,
  QUESTION_DOMAINS,
  TAXONOMY,
  foldTaxonomyName,
  isDomainForSection,
  normalizeQuestionDomain,
  resolveDomain,
  resolveSkill,
  skillIdFor,
  skillsForDomain,
} from "@/lib/question-taxonomy";
import {
  resolveDomainRow,
  resolveSkillRow,
  type TaxonomyTables,
} from "@/lib/taxonomy-db";

/**
 * T2.2. These pin the two things that make the controlled vocabulary worth
 * having: the ids are stable, and no two names can mean the same skill.
 */

describe("taxonomy shape", () => {
  it("has unique domain ids and names", () => {
    expect(new Set(TAXONOMY.map((d) => d.id)).size).toBe(TAXONOMY.length);
    expect(new Set(TAXONOMY.map((d) => d.name)).size).toBe(TAXONOMY.length);
  });

  it("has unique skill ids", () => {
    expect(new Set(ALL_SKILL_SPECS.map((s) => s.id)).size).toBe(ALL_SKILL_SPECS.length);
  });

  it("gives every skill exactly one domain", () => {
    for (const skill of ALL_SKILL_SPECS) {
      const owners = TAXONOMY.filter((d) => d.skills.some((s) => s.id === skill.id));
      expect(owners).toHaveLength(1);
      expect(owners[0].id).toBe(skill.domainId);
    }
  });

  it("splits the domains four and four across the two sections", () => {
    expect(QUESTION_DOMAINS.READING_WRITING).toHaveLength(4);
    expect(QUESTION_DOMAINS.MATH).toHaveLength(4);
    expect(ALL_QUESTION_DOMAINS).toHaveLength(8);
  });

  /**
   * The whole point of the migration. Two skills that fold together are two
   * spellings of one thing, and nothing downstream would notice.
   */
  it("has no two skills that fold to the same name", () => {
    const seen = new Map<string, string>();
    for (const skill of ALL_SKILL_SPECS) {
      const key = foldTaxonomyName(skill.name);
      expect(seen.get(key), `"${skill.name}" collides with "${seen.get(key)}"`).toBeUndefined();
      seen.set(key, skill.name);
    }
  });
});

describe("foldTaxonomyName", () => {
  it("collapses case, punctuation and plurality", () => {
    expect(foldTaxonomyName("Right Triangles")).toBe(foldTaxonomyName("right triangle"));
    expect(foldTaxonomyName("Ratios, rates, and proportions")).toBe(
      foldTaxonomyName("ratio rates and proportion"),
    );
    expect(foldTaxonomyName("  Linear equations  ")).toBe("linear equation");
  });

  it("keeps genuinely different names apart", () => {
    expect(foldTaxonomyName("Linear functions")).not.toBe(
      foldTaxonomyName("Nonlinear functions"),
    );
    expect(foldTaxonomyName("Area and volume")).not.toBe(foldTaxonomyName("Area"));
  });

  it("leaves short words ending in s alone", () => {
    // "is" and "as" are not plurals; stripping them would fold unrelated names.
    expect(foldTaxonomyName("As is")).toBe("as is");
  });
});

describe("resolveDomain", () => {
  it("accepts the canonical name", () => {
    expect(resolveDomain("Advanced Math")?.id).toBe("advanced-math");
  });

  it("accepts case and punctuation variants", () => {
    expect(resolveDomain("advanced math")?.id).toBe("advanced-math");
    expect(resolveDomain("Problem Solving and Data Analysis")?.id).toBe(
      "problem-solving-data-analysis",
    );
  });

  it("accepts the two pre-T2.2 aliases", () => {
    expect(resolveDomain("Geometry")?.id).toBe("geometry-trigonometry");
    expect(resolveDomain("problem solving and data analysis")?.id).toBe(
      "problem-solving-data-analysis",
    );
  });

  it("rejects an unknown name", () => {
    expect(resolveDomain("Trigonometry")).toBeNull();
    expect(normalizeQuestionDomain("Trigonometry")).toBeNull();
  });

  it("keeps isDomainForSection honest across sections", () => {
    expect(isDomainForSection("Algebra", "MATH")).toBe(true);
    expect(isDomainForSection("Algebra", "READING_WRITING")).toBe(false);
    expect(isDomainForSection("algebra", "MATH")).toBe(true);
  });
});

describe("resolveSkill", () => {
  it("resolves a canonical name", () => {
    expect(resolveSkill("Nonlinear functions")?.id).toBe("advanced-nonlinear-functions");
  });

  it("resolves a case variant without needing an alias entry", () => {
    // "Area and Volume" and "Right Triangles" were both in the bank.
    expect(resolveSkill("Area and Volume")?.id).toBe("geometry-area-volume");
    expect(resolveSkill("Right Triangles")?.id).toBe(
      "geometry-right-triangles-trigonometry",
    );
  });

  it("resolves the legacy spellings the migration mapped", () => {
    const cases: [string, string][] = [
      ["Text Purpose", "craft-text-structure-purpose"],
      ["Quadratic equations", "advanced-nonlinear-equations"],
      ["Exponential functions", "advanced-nonlinear-functions"],
      ["Linear models", "algebra-linear-functions"],
      ["Systems of linear inequalities", "algebra-linear-inequalities"],
      ["Volume of cylinders, cones, and spheres", "geometry-area-volume"],
      ["Circles in the coordinate plane", "geometry-circles"],
      ["Scatterplots", "psda-two-variable-data"],
      ["Units and rates", "psda-ratios-rates-units"],
      ["Center, spread, and shape of distributions", "psda-one-variable-data"],
    ];
    for (const [legacy, expected] of cases) {
      expect(resolveSkill(legacy)?.id, legacy).toBe(expected);
    }
  });

  /**
   * These are the values the migration deliberately refused to guess at. If one
   * ever starts resolving, 21 questions silently leave the review queue with a
   * tag nobody wrote — which is what T8.1's mastery model would then be built on.
   */
  it("refuses to guess the genuinely ambiguous values", () => {
    for (const ambiguous of [
      "Data Analysis",
      "Data representation",
      "Data from tables and graphs",
      "Functions",
      "Evaluating functions",
      "Complex numbers",
      "Function notation",
      "Angles and Circles",
      "Polygons",
      "Two-way tables",
    ]) {
      expect(resolveSkill(ambiguous), ambiguous).toBeNull();
    }
  });

  it("reports the owning domain, which is how cross-domain tags are caught", () => {
    // Both were real disagreements in the bank: the skill is Craft and
    // Structure, the questions were filed under Information and Ideas.
    expect(resolveSkill("Words in Context")?.domainId).toBe("craft-structure");
    expect(resolveSkill("Cross-Text Connections")?.domainId).toBe("craft-structure");
  });
});

describe("skillsForDomain / skillIdFor", () => {
  it("lists a domain's skills in authoring order", () => {
    expect(skillsForDomain("algebra").map((s) => s.name)).toEqual([
      "Linear equations in one variable",
      "Linear equations in two variables",
      "Linear functions",
      "Systems of two linear equations in two variables",
      "Linear inequalities in one or two variables",
    ]);
  });

  it("returns nothing for an unknown domain", () => {
    expect(skillsForDomain("nope")).toEqual([]);
  });

  it("slugs a new skill into the same shape as a seeded id", () => {
    expect(skillIdFor("algebra", "Rational exponents")).toBe("algebra-rational-exponents");
    expect(skillIdFor("algebra", "  Ratios, rates & units!  ")).toBe(
      "algebra-ratios-rates-units",
    );
  });
});

// ---------- Row resolution (the import path's gate) ----------

const TABLES: TaxonomyTables = {
  domains: TAXONOMY.map((domain, index) => ({
    id: domain.id,
    name: domain.name,
    sectionType: domain.sectionType,
    sortOrder: index,
  })),
  skills: TAXONOMY.flatMap((domain) =>
    domain.skills.map((skill, index) => ({
      id: skill.id,
      domainId: domain.id,
      name: skill.name,
      sortOrder: index,
    })),
  ),
};

describe("resolveDomainRow", () => {
  it("resolves a name to its row", () => {
    const result = resolveDomainRow(TABLES, "Geometry and Trigonometry");
    expect(result.ok && result.value.id).toBe("geometry-trigonometry");
  });

  it("names the valid options when the domain is unknown", () => {
    const result = resolveDomainRow(TABLES, "Trigonometry", "MATH");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Unknown domain");
      expect(result.error).toContain("Algebra");
      // Scoped to the section, so a Math import is not told to use "Boundaries".
      expect(result.error).not.toContain("Craft and Structure");
    }
  });

  it("rejects a domain from the other section by name", () => {
    const result = resolveDomainRow(TABLES, "Algebra", "READING_WRITING");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("belongs to Math");
  });
});

describe("resolveSkillRow", () => {
  const algebra = TABLES.domains.find((d) => d.id === "algebra")!;
  const craft = TABLES.domains.find((d) => d.id === "craft-structure")!;

  it("resolves a canonical name within its domain", () => {
    const result = resolveSkillRow(TABLES, algebra, "Linear functions");
    expect(result.ok && result.value.id).toBe("algebra-linear-functions");
  });

  it("resolves a case variant rather than rejecting it as unknown", () => {
    const result = resolveSkillRow(TABLES, algebra, "linear FUNCTIONS");
    expect(result.ok && result.value.id).toBe("algebra-linear-functions");
  });

  it("resolves a legacy alias within its domain", () => {
    const result = resolveSkillRow(TABLES, algebra, "Systems of linear equations");
    expect(result.ok && result.value.id).toBe("algebra-systems-two-linear-equations");
  });

  /**
   * The error has to distinguish "there is no such skill" from "that skill is
   * real but lives elsewhere" — the fixes are different, and the second is the
   * mistake the bank actually made 17 times.
   */
  it("says where a real skill actually lives", () => {
    const result = resolveSkillRow(TABLES, algebra, "Words in Context");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("belongs to Craft and Structure");
      expect(result.error).toContain("Linear functions");
    }
  });

  it("lists the domain's skills when the name is unknown", () => {
    const result = resolveSkillRow(TABLES, craft, "Vibes");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unknown skill "Vibes"');
      expect(result.error).toContain("Words in Context");
    }
  });
});
