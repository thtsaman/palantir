CREATE TYPE "LessonLifecycle" AS ENUM ('OBSERVATION', 'IDENTIFIED', 'ACTION_ASSIGNED', 'VALIDATED');

ALTER TABLE "OperationLesson"
  ADD COLUMN "lifecycle" "LessonLifecycle" NOT NULL DEFAULT 'OBSERVATION',
  ADD COLUMN "actionOwner" TEXT,
  ADD COLUMN "actionDueDate" TIMESTAMP(3),
  ADD COLUMN "validationNotes" TEXT,
  ADD COLUMN "validatedAt" TIMESTAMP(3);
