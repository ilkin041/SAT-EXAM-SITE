import { prisma } from "../src/lib/prisma";
import { questionContentHash } from "../src/lib/question-content-hash";

async function main() {
  const questions = await prisma.question.findMany({
    select: { id: true, stem: true, passage: true, contentHash: true },
  });
  const pending = questions.filter(
    (question) =>
      question.contentHash !==
      questionContentHash({ stem: question.stem, passage: question.passage }),
  );

  for (let offset = 0; offset < pending.length; offset += 100) {
    const batch = pending.slice(offset, offset + 100);
    await prisma.$transaction(
      batch.map((question) =>
        prisma.question.update({
          where: { id: question.id },
          data: {
            contentHash: questionContentHash({
              stem: question.stem,
              passage: question.passage,
            }),
          },
        }),
      ),
    );
  }

  console.log(`Backfilled ${pending.length} of ${questions.length} question hashes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
