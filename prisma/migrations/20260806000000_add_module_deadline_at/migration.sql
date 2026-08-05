-- Persist the authoritative deadline so expired attempts can be queried without
-- reconstructing timing state in application code.
ALTER TABLE "TestAttempt" ADD COLUMN "moduleDeadlineAt" TIMESTAMP(3);

-- Preserve the correct deadline for attempts already in progress at deploy.
UPDATE "TestAttempt" AS attempt
SET "moduleDeadlineAt" = attempt."moduleStartedAt" +
  make_interval(secs => 10 + CASE
    WHEN module."moduleNumber" = 1 THEN section."module1TimeLimit"
    ELSE section."module2TimeLimit"
  END)
FROM "Module" AS module
JOIN "Section" AS section ON section."id" = module."sectionId"
WHERE attempt."currentModuleId" = module."id"
  AND attempt."status" = 'IN_PROGRESS'
  AND attempt."moduleStartedAt" IS NOT NULL;

CREATE INDEX "TestAttempt_status_moduleDeadlineAt_idx"
ON "TestAttempt"("status", "moduleDeadlineAt");
