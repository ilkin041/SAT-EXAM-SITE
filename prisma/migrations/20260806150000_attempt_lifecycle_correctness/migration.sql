SET search_path TO public;

ALTER TYPE "AttemptStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Answer"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "AttemptQuestionSnapshot" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "acceptedAnswers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptQuestionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttemptQuestionSnapshot_attemptId_questionId_key"
ON "AttemptQuestionSnapshot"("attemptId", "questionId");

CREATE INDEX "AttemptQuestionSnapshot_attemptId_moduleId_idx"
ON "AttemptQuestionSnapshot"("attemptId", "moduleId");

CREATE INDEX "AttemptQuestionSnapshot_questionId_idx"
ON "AttemptQuestionSnapshot"("questionId");

ALTER TABLE "AttemptQuestionSnapshot"
ADD CONSTRAINT "AttemptQuestionSnapshot_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
