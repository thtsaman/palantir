CREATE TABLE "Company" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Platoon" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Platoon_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Squad" ADD COLUMN "platoonId" TEXT;
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");
CREATE UNIQUE INDEX "Platoon_code_key" ON "Platoon"("code");
CREATE INDEX "Company_unitId_idx" ON "Company"("unitId");
CREATE INDEX "Platoon_companyId_idx" ON "Platoon"("companyId");
CREATE INDEX "Squad_platoonId_idx" ON "Squad"("platoonId");
ALTER TABLE "Company" ADD CONSTRAINT "Company_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Platoon" ADD CONSTRAINT "Platoon_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_platoonId_fkey" FOREIGN KEY ("platoonId") REFERENCES "Platoon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "GroupSimulationRun" (
  "id" TEXT NOT NULL,
  "groupType" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "unitId" TEXT,
  "squadId" TEXT,
  "groupLabelSnapshot" TEXT NOT NULL,
  "scenarioId" TEXT,
  "inputsSnapshot" JSONB NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "includedCount" INTEGER NOT NULL,
  "excludedCount" INTEGER NOT NULL,
  "incompleteCount" INTEGER NOT NULL,
  "aggregateSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupSimulationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupSimulationMember" (
  "id" TEXT NOT NULL,
  "groupRunId" TEXT NOT NULL,
  "soldierId" TEXT,
  "soldierCode" TEXT NOT NULL,
  "included" BOOLEAN NOT NULL,
  "exclusionReason" TEXT,
  "profileQuality" TEXT NOT NULL,
  "baselineSnapshot" JSONB,
  "outputSnapshot" JSONB,
  "timelineSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupSimulationMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupSimulationRun_groupType_groupId_createdAt_idx" ON "GroupSimulationRun"("groupType", "groupId", "createdAt");
CREATE INDEX "GroupSimulationMember_groupRunId_soldierCode_idx" ON "GroupSimulationMember"("groupRunId", "soldierCode");

ALTER TABLE "GroupSimulationRun" ADD CONSTRAINT "GroupSimulationRun_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupSimulationRun" ADD CONSTRAINT "GroupSimulationRun_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupSimulationRun" ADD CONSTRAINT "GroupSimulationRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "MissionScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupSimulationMember" ADD CONSTRAINT "GroupSimulationMember_groupRunId_fkey" FOREIGN KEY ("groupRunId") REFERENCES "GroupSimulationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupSimulationMember" ADD CONSTRAINT "GroupSimulationMember_soldierId_fkey" FOREIGN KEY ("soldierId") REFERENCES "Soldier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
