/**
 * Push `src/lib/question-taxonomy.ts` into the `Domain` and `Skill` tables.
 *
 *   npm run db:seed-taxonomy
 *
 * Idempotent, and safe on a database a tutor has already added skills to: rows
 * are upserted by their stable slug id, and nothing is deleted. A skill that
 * exists in the table but not in the file is left alone — that is exactly what
 * "added through the admin form" looks like, and this script is not the
 * authority on what exists. The file seeds; the tables rule.
 */
import { PrismaClient } from "@prisma/client";
import { TAXONOMY } from "../src/lib/question-taxonomy";

export async function seedTaxonomy(prisma: PrismaClient) {
  let domains = 0;
  let skills = 0;

  for (const [domainIndex, domain] of TAXONOMY.entries()) {
    await prisma.domain.upsert({
      where: { id: domain.id },
      create: {
        id: domain.id,
        name: domain.name,
        sectionType: domain.sectionType,
        sortOrder: domainIndex,
      },
      update: { name: domain.name, sectionType: domain.sectionType, sortOrder: domainIndex },
    });
    domains++;

    for (const [skillIndex, skill] of domain.skills.entries()) {
      await prisma.skill.upsert({
        where: { id: skill.id },
        create: {
          id: skill.id,
          domainId: domain.id,
          name: skill.name,
          sortOrder: skillIndex,
        },
        update: { domainId: domain.id, name: skill.name, sortOrder: skillIndex },
      });
      skills++;
    }
  }

  return { domains, skills };
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedTaxonomy(prisma)
    .then(({ domains, skills }) => {
      console.log(`Seeded ${domains} domains and ${skills} skills.`);
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
