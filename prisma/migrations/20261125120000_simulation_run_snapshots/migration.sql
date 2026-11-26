ALTER TABLE "MissionRun"
ADD COLUMN "inputsSnapshot" JSONB,
ADD COLUMN "baselineSnapshot" JSONB,
ADD COLUMN "modelVersion" TEXT;
