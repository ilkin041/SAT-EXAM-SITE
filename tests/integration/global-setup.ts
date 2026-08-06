import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function quotedIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export default async function setup() {
  const schema = process.env.PHASE2_TEST_SCHEMA;
  const baseDatabaseUrl = process.env.PHASE2_BASE_DATABASE_URL;
  const testDatabaseUrl = process.env.DATABASE_URL;
  if (!schema || !baseDatabaseUrl || !testDatabaseUrl) {
    throw new Error("Integration database environment was not initialized");
  }

  const admin = new PrismaClient({
    datasources: { db: { url: baseDatabaseUrl } },
  });

  await admin.$executeRawUnsafe(`CREATE SCHEMA ${quotedIdentifier(schema)}`);

  try {
    execFileSync(
      process.execPath,
      [
        path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"),
        "db",
        "push",
        "--skip-generate",
        "--accept-data-loss",
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        stdio: "inherit",
      },
    );
  } catch (error) {
    await admin.$executeRawUnsafe(`DROP SCHEMA ${quotedIdentifier(schema)} CASCADE`);
    await admin.$disconnect();
    throw error;
  }

  return async () => {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${quotedIdentifier(schema)} CASCADE`);
    await admin.$disconnect();
  };
}
