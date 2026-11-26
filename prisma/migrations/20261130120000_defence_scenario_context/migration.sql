ALTER TABLE "MissionScenario" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HistoricalOperation" ADD COLUMN "operationDate" TIMESTAMP(3);
ALTER TABLE "HistoricalOperation" ADD COLUMN "missionCategory" TEXT;
ALTER TABLE "HistoricalOperation" ADD COLUMN "adversaryContext" TEXT;
