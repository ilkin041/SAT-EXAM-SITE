-- CreateEnum
CREATE TYPE "AnnotationColor" AS ENUM ('YELLOW', 'BLUE', 'PINK');

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "color" "AnnotationColor" NOT NULL DEFAULT 'YELLOW',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Annotation_attemptId_idx" ON "Annotation"("attemptId");
CREATE INDEX "Annotation_questionId_idx" ON "Annotation"("questionId");

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
