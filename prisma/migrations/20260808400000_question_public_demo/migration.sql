-- T3.3: opt-in flag for the landing page's three-question demo.
--
-- Default false and no backfill on purpose. This flag asserts a question is
-- originally authored and licensable for the open web, which is a claim only a
-- person can make; flipping the whole bank on would publish content that may be
-- College Board-derived to logged-out visitors.
ALTER TABLE "Question" ADD COLUMN "publicDemo" BOOLEAN NOT NULL DEFAULT false;

-- The demo query is `where publicDemo = true` over the whole bank.
CREATE INDEX "Question_publicDemo_idx" ON "Question"("publicDemo");
