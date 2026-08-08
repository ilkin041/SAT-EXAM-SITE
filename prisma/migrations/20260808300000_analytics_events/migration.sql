-- T2.3 — first-party event pipeline.
--
-- Two tables. `AnalyticsSession` holds the things that are true of a browser
-- (device, viewport, user agent) so they are stored once rather than copied
-- onto every event; `AnalyticsEvent` holds the funnel itself.
--
-- `name` is TEXT, not an enum: adding an event should be a code change, and an
-- unknown name arriving from an older deploy must still record rather than
-- error. The catalogue lives in `src/lib/analytics-events.ts`.

CREATE TYPE "DeviceType" AS ENUM (
  'MOBILE',
  'TABLET',
  'DESKTOP',
  'BOT',
  'UNKNOWN'
);

CREATE TABLE "AnalyticsSession" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT,
  "deviceType"    "DeviceType" NOT NULL DEFAULT 'UNKNOWN',
  "viewportWidth" INTEGER,
  "userAgent"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsSession_createdAt_idx" ON "AnalyticsSession"("createdAt");
CREATE INDEX "AnalyticsSession_deviceType_idx" ON "AnalyticsSession"("deviceType");
CREATE INDEX "AnalyticsSession_userId_idx" ON "AnalyticsSession"("userId");

CREATE TABLE "AnalyticsEvent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "sessionId" TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "props"     JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- The funnel query is "count rows of name X in a date window", so the composite
-- index leads with `name`. `createdAt` alone covers the retention sweep.
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

ALTER TABLE "AnalyticsEvent"
ADD CONSTRAINT "AnalyticsEvent_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- `userId` on both tables is deliberately NOT a foreign key. Deleting a user
-- must not cascade away the funnel counts they contributed to, and analytics
-- must never be the reason a user deletion fails.
