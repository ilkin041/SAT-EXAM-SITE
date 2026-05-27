-- 1. Create the join table (no FKs yet, so the backfill below can populate
--    rows without referential checks racing data movement).
CREATE TABLE "ModuleQuestion" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModuleQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModuleQuestion_moduleId_questionId_key"
    ON "ModuleQuestion"("moduleId", "questionId");
CREATE UNIQUE INDEX "ModuleQuestion_moduleId_order_key"
    ON "ModuleQuestion"("moduleId", "order");
CREATE INDEX "ModuleQuestion_moduleId_idx"   ON "ModuleQuestion"("moduleId");
CREATE INDEX "ModuleQuestion_questionId_idx" ON "ModuleQuestion"("questionId");

-- 2. BACKFILL: every existing Question.moduleId → one ModuleQuestion row.
--    The existing Question."order" values may collide within a module (the old
--    schema didn't enforce a unique constraint on them), so we use ROW_NUMBER()
--    to assign clean 1..N sequential orders per module instead of copying the
--    raw values. Ties on existing `order` are broken by question id for stability.
--    md5() is always available in Postgres — no extension required.
INSERT INTO "ModuleQuestion" ("id", "moduleId", "questionId", "order", "createdAt")
SELECT
    'mq_' || md5(random()::text || clock_timestamp()::text || q."id"),
    q."moduleId",
    q."id",
    ROW_NUMBER() OVER (PARTITION BY q."moduleId" ORDER BY q."order", q."id"),
    NOW()
FROM "Question" q
WHERE q."moduleId" IS NOT NULL;

-- 3. Sanity check — abort the whole migration (transactional) if any row was
--    lost in translation. If this fires, your Question table is untouched.
DO $$
DECLARE
    q_count INT;
    mq_count INT;
BEGIN
    SELECT COUNT(*) INTO q_count  FROM "Question" WHERE "moduleId" IS NOT NULL;
    SELECT COUNT(*) INTO mq_count FROM "ModuleQuestion";
    IF q_count <> mq_count THEN
        RAISE EXCEPTION
            'Backfill mismatch: % Question rows with moduleId, but only % ModuleQuestion rows. Aborting.',
            q_count, mq_count;
    END IF;
END $$;

-- 4. Drop the old FK / index / column on Question now that the join data exists.
ALTER TABLE "Question" DROP CONSTRAINT "Question_moduleId_fkey";
DROP INDEX "Question_moduleId_idx";
ALTER TABLE "Question" DROP COLUMN "moduleId";

-- 5. Add FKs on the join table now that the data is in place and the old
--    column is gone.
ALTER TABLE "ModuleQuestion" ADD CONSTRAINT "ModuleQuestion_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModuleQuestion" ADD CONSTRAINT "ModuleQuestion_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
