import "dotenv/config";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { defineConfig } from "vitest/config";

const schema = `phase2_${Date.now()}_${randomBytes(4).toString("hex")}`;
const baseDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

if (!baseDatabaseUrl) {
  throw new Error("Set TEST_DATABASE_URL (preferred) or DATABASE_URL to run integration tests");
}

const testDatabaseUrl = new URL(baseDatabaseUrl);
testDatabaseUrl.searchParams.set("schema", schema);
process.env.DATABASE_URL = testDatabaseUrl.toString();
process.env.PHASE2_TEST_SCHEMA = schema;
process.env.PHASE2_BASE_DATABASE_URL = baseDatabaseUrl;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
