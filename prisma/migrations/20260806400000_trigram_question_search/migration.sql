CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Question_stem_trgm_idx"
ON "Question" USING GIN ("stem" gin_trgm_ops);

CREATE INDEX "Question_passage_trgm_idx"
ON "Question" USING GIN ("passage" gin_trgm_ops);

CREATE INDEX "Question_domain_trgm_idx"
ON "Question" USING GIN ("domain" gin_trgm_ops);

CREATE INDEX "Question_skill_trgm_idx"
ON "Question" USING GIN ("skill" gin_trgm_ops);
