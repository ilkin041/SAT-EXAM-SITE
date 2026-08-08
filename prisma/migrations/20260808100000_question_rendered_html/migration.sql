-- Pre-rendered KaTeX output for a question's rich content.
-- Nullable on purpose: existing rows stay readable until the backfill runs
-- (`npm run db:backfill-question-html`), and every reader falls back to
-- rendering on the server when this is NULL.
ALTER TABLE "Question" ADD COLUMN "renderedHtml" JSONB;
