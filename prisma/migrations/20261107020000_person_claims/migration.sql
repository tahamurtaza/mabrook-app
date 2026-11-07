-- AlterTable
ALTER TABLE "events" ADD COLUMN     "adopted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "people" ADD COLUMN     "claimedName" TEXT;

