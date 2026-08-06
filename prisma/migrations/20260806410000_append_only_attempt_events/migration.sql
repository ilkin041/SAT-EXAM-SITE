CREATE TYPE "AttemptEventType" AS ENUM (
  'BLUR',
  'FOCUS',
  'FULLSCREEN_EXIT',
  'FULLSCREEN_ENTER'
);

CREATE TABLE "AttemptEvent" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "type" "AttemptEventType" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttemptEvent_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AttemptEvent" ("id", "attemptId", "type", "occurredAt")
SELECT
  'legacy_' || md5(attempt."id" || event.ordinality::text || event.value::text),
  attempt."id",
  CASE event.value->>'type'
    WHEN 'blur' THEN 'BLUR'::"AttemptEventType"
    WHEN 'focus' THEN 'FOCUS'::"AttemptEventType"
    WHEN 'fullscreen_exit' THEN 'FULLSCREEN_EXIT'::"AttemptEventType"
    WHEN 'fullscreen_enter' THEN 'FULLSCREEN_ENTER'::"AttemptEventType"
  END,
  to_timestamp((event.value->>'at')::double precision / 1000.0)
FROM "TestAttempt" AS attempt
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(attempt."focusEvents", '[]'::jsonb))
  WITH ORDINALITY AS event(value, ordinality)
WHERE event.value->>'type' IN ('blur', 'focus', 'fullscreen_exit', 'fullscreen_enter')
  AND event.value->>'at' ~ '^[0-9]+(\.[0-9]+)?$';

CREATE INDEX "AttemptEvent_attemptId_occurredAt_idx"
ON "AttemptEvent"("attemptId", "occurredAt");

ALTER TABLE "AttemptEvent"
ADD CONSTRAINT "AttemptEvent_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestAttempt" DROP COLUMN "focusEvents";
