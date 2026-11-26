CREATE TYPE "LessonReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ExtractionMode" AS ENUM ('AI', 'FALLBACK', 'MANUAL', 'LEGACY');
CREATE TYPE "OperationWorkflowStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'EXTRACTION_COMPLETED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'FAILED');

ALTER TYPE "OperationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "HistoricalOperation"
  ADD COLUMN "extractionMode" "ExtractionMode" NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "extractionConfidence" DOUBLE PRECISION,
  ADD COLUMN "extractionJson" JSONB,
  ADD COLUMN "reviewNotes" TEXT,
  ADD COLUMN "workflowStatus" "OperationWorkflowStatus" NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedBy" TEXT;

ALTER TABLE "OperationLesson"
  ADD COLUMN "reviewStatus" "LessonReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "extractionMode" "ExtractionMode" NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "confidence" DOUBLE PRECISION,
  ADD COLUMN "sourcePassage" TEXT,
  ADD COLUMN "editedDuringReview" BOOLEAN NOT NULL DEFAULT false;

UPDATE "HistoricalOperation" SET "workflowStatus" = 'APPROVED' WHERE "status" = 'REVIEWED';
UPDATE "HistoricalOperation" SET "workflowStatus" = 'NEEDS_REVIEW' WHERE "status" = 'STRUCTURED';
