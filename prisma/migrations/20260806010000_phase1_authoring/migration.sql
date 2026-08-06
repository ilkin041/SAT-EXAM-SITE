-- Normalize the two legacy aliases before closing the SAT domain set.
UPDATE "Question"
SET "domain" = 'Geometry and Trigonometry'
WHERE "domain" = 'Geometry';

UPDATE "Question"
SET "domain" = 'Problem-Solving and Data Analysis'
WHERE "domain" = 'Problem Solving and Data Analysis';

ALTER TABLE "Question"
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Question_contentHash_idx" ON "Question"("contentHash");

ALTER TABLE "Question" ADD CONSTRAINT "Question_domain_check" CHECK (
  "domain" IN (
    'Information and Ideas',
    'Craft and Structure',
    'Expression of Ideas',
    'Standard English Conventions',
    'Algebra',
    'Advanced Math',
    'Problem-Solving and Data Analysis',
    'Geometry and Trigonometry'
  )
);
