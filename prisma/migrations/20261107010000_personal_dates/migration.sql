-- AlterTable
ALTER TABLE "events" ADD COLUMN     "personalDateId" TEXT;

-- CreateTable
CREATE TABLE "personal_dates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EventType" NOT NULL DEFAULT 'OTHER',
    "label" TEXT,
    "observedCalendar" "ObservedCalendar" NOT NULL DEFAULT 'GREGORIAN',
    "enteredCalendar" "CalendarSystem" NOT NULL DEFAULT 'GREGORIAN',
    "gregorianYear" INTEGER NOT NULL,
    "gregorianMonth" INTEGER NOT NULL,
    "gregorianDay" INTEGER NOT NULL,
    "hijriYear" INTEGER NOT NULL,
    "hijriMonth" INTEGER NOT NULL,
    "hijriDay" INTEGER NOT NULL,
    "afterSunset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_dates_userId_idx" ON "personal_dates"("userId");

-- CreateIndex
CREATE INDEX "events_personalDateId_idx" ON "events"("personalDateId");

-- CreateIndex
CREATE UNIQUE INDEX "events_groupId_personalDateId_key" ON "events"("groupId", "personalDateId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_personalDateId_fkey" FOREIGN KEY ("personalDateId") REFERENCES "personal_dates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_dates" ADD CONSTRAINT "personal_dates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

