-- CreateEnum
CREATE TYPE "TerrainType" AS ENUM ('FLAT', 'ROLLING', 'MOUNTAIN', 'STEEP_MOUNTAIN', 'MIXED');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('DAY', 'NIGHT');

-- CreateEnum
CREATE TYPE "MissionRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('DRAFT', 'STRUCTURED', 'REVIEWED');

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Soldier" (
    "id" TEXT NOT NULL,
    "soldierCode" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL,
    "baselineMobility" INTEGER NOT NULL,
    "baselineEndurance" INTEGER NOT NULL,
    "baselineStrength" INTEGER NOT NULL,
    "baselineRecovery" INTEGER NOT NULL,
    "typicalLoadKg" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Soldier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionScenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "terrainType" "TerrainType" NOT NULL,
    "altitudeMeters" INTEGER NOT NULL,
    "temperatureCelsius" DOUBLE PRECISION NOT NULL,
    "loadKg" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "restMinutes" INTEGER NOT NULL,
    "timeOfDay" "TimeOfDay" NOT NULL,
    "description" TEXT,
    "soldierId" TEXT,
    "sourceOperationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionRun" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "soldierId" TEXT,
    "status" "MissionRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "finalFatigue" DOUBLE PRECISION,
    "finalMobility" DOUBLE PRECISION,
    "finalEndurance" DOUBLE PRECISION,
    "finalPerformance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "missionRunId" TEXT NOT NULL,
    "timeMinutes" INTEGER NOT NULL,
    "fatigue" DOUBLE PRECISION NOT NULL,
    "mobility" DOUBLE PRECISION NOT NULL,
    "endurance" DOUBLE PRECISION NOT NULL,
    "performance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalOperation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "terrainType" "TerrainType" NOT NULL,
    "altitudeBand" TEXT NOT NULL,
    "temperatureBand" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "timeOfDay" "TimeOfDay" NOT NULL,
    "weatherSummary" TEXT NOT NULL,
    "personnelSummary" TEXT NOT NULL,
    "environmentalFactors" TEXT NOT NULL,
    "humanFactors" TEXT NOT NULL,
    "rawReport" TEXT,
    "aiSummary" TEXT,
    "status" "OperationStatus" NOT NULL DEFAULT 'STRUCTURED',
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationLesson" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Squad_code_key" ON "Squad"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Soldier_soldierCode_key" ON "Soldier"("soldierCode");

-- CreateIndex
CREATE INDEX "PerformanceSnapshot_missionRunId_timeMinutes_idx" ON "PerformanceSnapshot"("missionRunId", "timeMinutes");

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soldier" ADD CONSTRAINT "Soldier_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionScenario" ADD CONSTRAINT "MissionScenario_soldierId_fkey" FOREIGN KEY ("soldierId") REFERENCES "Soldier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionScenario" ADD CONSTRAINT "MissionScenario_sourceOperationId_fkey" FOREIGN KEY ("sourceOperationId") REFERENCES "HistoricalOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRun" ADD CONSTRAINT "MissionRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "MissionScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionRun" ADD CONSTRAINT "MissionRun_soldierId_fkey" FOREIGN KEY ("soldierId") REFERENCES "Soldier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceSnapshot" ADD CONSTRAINT "PerformanceSnapshot_missionRunId_fkey" FOREIGN KEY ("missionRunId") REFERENCES "MissionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationLesson" ADD CONSTRAINT "OperationLesson_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "HistoricalOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
