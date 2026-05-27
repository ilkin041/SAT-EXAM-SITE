-- 1. Add nullable sectionType so we can backfill existing rows.
ALTER TABLE "Question" ADD COLUMN "sectionType" "SectionType";

-- 2. Backfill from module assignments where possible.
--    DISTINCT ON keeps the earliest assignment per question; ties are resolved
--    by createdAt, then by id (defensive — should not actually tie).
UPDATE "Question" q SET "sectionType" = sub.section_type
FROM (
  SELECT DISTINCT ON (mq."questionId")
    mq."questionId",
    s."type" AS section_type
  FROM "ModuleQuestion" mq
  JOIN "Module"  m ON mq."moduleId" = m."id"
  JOIN "Section" s ON m."sectionId" = s."id"
  ORDER BY mq."questionId", mq."createdAt" ASC, mq."id" ASC
) sub
WHERE sub."questionId" = q."id"
  AND q."sectionType" IS NULL;

-- 3. Any leftover (orphan / unassigned) questions get a domain-based guess.
--    The keyword list covers the SAT math domains used by the platform.
UPDATE "Question" SET "sectionType" =
  CASE
    WHEN LOWER("domain") LIKE '%algebra%'
      OR LOWER("domain") LIKE '%geometry%'
      OR LOWER("domain") LIKE '%trigonometry%'
      OR LOWER("domain") LIKE '%advanced math%'
      OR LOWER("domain") LIKE '%data analysis%'
      OR LOWER("domain") LIKE '%problem solving%'
      OR LOWER("domain") LIKE '%math%'
    THEN 'MATH'::"SectionType"
    ELSE 'READING_WRITING'::"SectionType"
  END
WHERE "sectionType" IS NULL;

-- 4. Lock it down.
ALTER TABLE "Question" ALTER COLUMN "sectionType" SET NOT NULL;
CREATE INDEX "Question_sectionType_idx" ON "Question"("sectionType");

-- 5. Image position enum + column with safe default (current behavior).
CREATE TYPE "ImagePosition" AS ENUM ('TOP', 'INLINE');
ALTER TABLE "Question"
  ADD COLUMN "imagePosition" "ImagePosition" NOT NULL DEFAULT 'INLINE';

-- 6. Optional pixel cap on rendered image width. NULL = browser default.
ALTER TABLE "Question" ADD COLUMN "imageMaxWidth" INTEGER;
