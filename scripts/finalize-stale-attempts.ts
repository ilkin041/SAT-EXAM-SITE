import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { sweepStaleAttempts } from "../src/lib/attempt-engine";

async function main() {
  const result = await sweepStaleAttempts();
  console.log(JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
