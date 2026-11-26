CREATE TYPE "DataProvenance" AS ENUM ('USER_ENTERED', 'IMPORTED', 'SYNTHETIC_DEMO', 'MODEL_GENERATED');

ALTER TABLE "Soldier"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "ageYears" INTEGER,
  ADD COLUMN "heightCm" DOUBLE PRECISION,
  ADD COLUMN "weightKg" DOUBLE PRECISION,
  ADD COLUMN "fitnessAssessment" TEXT,
  ADD COLUMN "assessmentDate" TIMESTAMP(3),
  ADD COLUMN "assessmentSource" TEXT,
  ADD COLUMN "profileProvenance" "DataProvenance",
  ADD COLUMN "profileSource" TEXT,
  ADD COLUMN "profileAssessedAt" TIMESTAMP(3),
  ADD COLUMN "mobilityProvenance" "DataProvenance",
  ADD COLUMN "enduranceProvenance" "DataProvenance",
  ADD COLUMN "strengthProvenance" "DataProvenance",
  ADD COLUMN "recoveryProvenance" "DataProvenance",
  ADD COLUMN "typicalLoadProvenance" "DataProvenance";

