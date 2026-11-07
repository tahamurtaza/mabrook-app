-- When someone finished or skipped the first-run guide. Null means it's still
-- to come, so it shows on their next visit from any device.
ALTER TABLE "users" ADD COLUMN "tourCompletedAt" TIMESTAMP(3);

-- Only accounts created from now on should be shown the guide.
UPDATE "users" SET "tourCompletedAt" = CURRENT_TIMESTAMP;
