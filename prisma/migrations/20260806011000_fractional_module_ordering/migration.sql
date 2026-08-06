DROP INDEX "ModuleQuestion_moduleId_order_key";

ALTER TABLE "ModuleQuestion"
  ALTER COLUMN "order" TYPE DOUBLE PRECISION USING "order"::DOUBLE PRECISION;
