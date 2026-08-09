-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('BIRTHDAY', 'ANNIVERSARY', 'ENGAGEMENT', 'NIKAH', 'NEW_HOME', 'NEW_JOB', 'NEW_OFFICE', 'SCHOOL_START', 'GRADUATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarSystem" AS ENUM ('GREGORIAN', 'HIJRI');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "EventType" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "observedCalendar" "CalendarSystem" NOT NULL DEFAULT 'GREGORIAN',
    "enteredCalendar" "CalendarSystem" NOT NULL DEFAULT 'GREGORIAN',
    "gregorianYear" INTEGER NOT NULL,
    "gregorianMonth" INTEGER NOT NULL,
    "gregorianDay" INTEGER NOT NULL,
    "hijriYear" INTEGER NOT NULL,
    "hijriMonth" INTEGER NOT NULL,
    "hijriDay" INTEGER NOT NULL,
    "afterSunset" BOOLEAN NOT NULL DEFAULT false,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_people" (
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "event_people_pkey" PRIMARY KEY ("eventId","personId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "people_userId_key" ON "people"("userId");

-- CreateIndex
CREATE INDEX "people_name_idx" ON "people"("name");

-- CreateIndex
CREATE INDEX "events_observedCalendar_gregorianMonth_gregorianDay_idx" ON "events"("observedCalendar", "gregorianMonth", "gregorianDay");

-- CreateIndex
CREATE INDEX "events_observedCalendar_hijriMonth_hijriDay_idx" ON "events"("observedCalendar", "hijriMonth", "hijriDay");

-- CreateIndex
CREATE INDEX "events_createdById_idx" ON "events"("createdById");

-- CreateIndex
CREATE INDEX "event_people_personId_idx" ON "event_people"("personId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

