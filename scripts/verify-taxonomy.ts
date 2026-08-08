/**
 * Check that the taxonomy tables and every question's tags still hold the
 * invariants T2.2 established.
 *
 *   npm run db:verify-taxonomy
 *
 * Exits non-zero on any violation, so it is usable as a guard after an import
 * or a bulk edit. It reads; it never writes.
 *
 * What it asserts:
 *   1. Every domain and skill in `question-taxonomy.ts` exists in the tables,
 *      with the same name and the same owning domain.
 *   2. No two skills fold to the same name — that is the exact failure this
 *      task removed, and re-introducing it is silent until a report is wrong.
 *   3. Every question's skill belongs to its own domain.
 *   4. Every question's domain matches its `sectionType`.
 *   5. The review queue is consistent: a queued question has no skill, and an
 *      unqueued one with no skill is reported so the queue stays the complete
 *      list of untagged work.
 */
import { PrismaClient } from "@prisma/client";
import { TAXONOMY, foldTaxonomyName } from "../src/lib/question-taxonomy";

const prisma = new PrismaClient();

async function main() {
  const problems: string[] = [];

  const [domains, skills] = await Promise.all([
    prisma.domain.findMany(),
    prisma.skill.findMany(),
  ]);
  const domainById = new Map(domains.map((d) => [d.id, d]));
  const skillById = new Map(skills.map((s) => [s.id, s]));

  // 1 — the seed is present and unchanged.
  for (const spec of TAXONOMY) {
    const row = domainById.get(spec.id);
    if (!row) {
      problems.push(`Domain "${spec.id}" is in question-taxonomy.ts but not in the table.`);
      continue;
    }
    if (row.name !== spec.name) {
      problems.push(`Domain "${spec.id}" is named "${row.name}" in the table, "${spec.name}" in the file.`);
    }
    if (row.sectionType !== spec.sectionType) {
      problems.push(`Domain "${spec.id}" is ${row.sectionType} in the table, ${spec.sectionType} in the file.`);
    }
    for (const skillSpec of spec.skills) {
      const skillRow = skillById.get(skillSpec.id);
      if (!skillRow) {
        problems.push(`Skill "${skillSpec.id}" is in question-taxonomy.ts but not in the table.`);
        continue;
      }
      if (skillRow.name !== skillSpec.name) {
        problems.push(`Skill "${skillSpec.id}" is named "${skillRow.name}" in the table, "${skillSpec.name}" in the file.`);
      }
      if (skillRow.domainId !== spec.id) {
        problems.push(`Skill "${skillSpec.id}" belongs to "${skillRow.domainId}" in the table, "${spec.id}" in the file.`);
      }
    }
  }

  // 2 — no second spelling of an existing skill.
  const byFold = new Map<string, string[]>();
  for (const skill of skills) {
    const key = foldTaxonomyName(skill.name);
    byFold.set(key, [...(byFold.get(key) ?? []), `${skill.id} ("${skill.name}")`]);
  }
  for (const [key, ids] of byFold) {
    if (ids.length > 1) {
      problems.push(`Skills collide on "${key}": ${ids.join(", ")}. One of them is a duplicate spelling.`);
    }
  }

  // 3 + 4 — question tags.
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      sectionType: true,
      domainId: true,
      skillId: true,
      taxonomyReview: { select: { id: true } },
    },
  });

  let untaggedWithoutReview = 0;
  let queued = 0;
  for (const question of questions) {
    const domain = domainById.get(question.domainId);
    if (!domain) {
      problems.push(`Question ${question.id} points at unknown domain "${question.domainId}".`);
      continue;
    }
    if (domain.sectionType !== question.sectionType) {
      problems.push(
        `Question ${question.id} is ${question.sectionType} but its domain "${domain.name}" is ${domain.sectionType}.`,
      );
    }
    if (question.skillId) {
      const skill = skillById.get(question.skillId);
      if (!skill) {
        problems.push(`Question ${question.id} points at unknown skill "${question.skillId}".`);
      } else if (skill.domainId !== question.domainId) {
        problems.push(
          `Question ${question.id} is in "${domain.name}" but its skill "${skill.name}" belongs to "${skill.domainId}".`,
        );
      }
      if (question.taxonomyReview) {
        problems.push(`Question ${question.id} has a skill and a review row — the row should have been cleared.`);
      }
    } else if (question.taxonomyReview) {
      queued++;
    } else {
      untaggedWithoutReview++;
    }
  }

  console.log(
    `${questions.length} questions · ${domains.length} domains · ${skills.length} skills · ${queued} in the review queue`,
  );
  if (untaggedWithoutReview > 0) {
    console.log(
      `${untaggedWithoutReview} question(s) have no skill and no review row — untagged, but not on anyone's list.`,
    );
  }

  if (problems.length === 0) {
    console.log("Taxonomy is consistent.");
    return;
  }
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.log(`  ${problem}`);
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
