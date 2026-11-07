-- Birthdays kept by the Hijri calendar are now called a Waras. Retitle the
-- shared copies already made. Titles are only ever generated for these, so
-- nothing anyone typed themselves is touched.
UPDATE "events" AS e
SET "title" = u."name" || 's Waras'
FROM "personal_dates" AS pd
JOIN "users" AS u ON u."id" = pd."userId"
WHERE e."personalDateId" = pd."id"
  AND pd."type" = 'BIRTHDAY'
  AND pd."observedCalendar" = 'HIJRI';
