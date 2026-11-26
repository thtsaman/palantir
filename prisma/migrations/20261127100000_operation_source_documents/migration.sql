CREATE TYPE "OperationSourceStatus" AS ENUM ('PREVIEW_READY', 'LINKED', 'FAILED');
CREATE TYPE "OperationSourceType" AS ENUM ('PDF', 'DOCX', 'TXT');

CREATE TABLE "OperationSourceDocument" (
  "id" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "fileType" "OperationSourceType" NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "storageRef" TEXT NOT NULL,
  "extractedText" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "OperationSourceStatus" NOT NULL DEFAULT 'PREVIEW_READY',
  "extractionError" TEXT,
  "operationId" TEXT,
  CONSTRAINT "OperationSourceDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationSourceDocument_storageRef_key" ON "OperationSourceDocument"("storageRef");
CREATE UNIQUE INDEX "OperationSourceDocument_operationId_key" ON "OperationSourceDocument"("operationId");
CREATE INDEX "OperationSourceDocument_status_uploadedAt_idx" ON "OperationSourceDocument"("status", "uploadedAt");
ALTER TABLE "OperationSourceDocument" ADD CONSTRAINT "OperationSourceDocument_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "HistoricalOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
