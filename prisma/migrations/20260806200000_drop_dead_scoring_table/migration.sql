-- Per-test scoringTable was never writable or validated. Scoring now uses the
-- documented built-in practice curve and adaptive route cap.
ALTER TABLE "Test" DROP COLUMN "scoringTable";
