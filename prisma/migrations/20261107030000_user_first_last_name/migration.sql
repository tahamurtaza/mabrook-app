-- Names become two fields, so people who share a first name can be told apart.
-- "name" stays as the full name that everything else reads.
ALTER TABLE "users" ADD COLUMN "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN "lastName" TEXT;

-- Existing accounts: the first word is the first name, and the rest, if any,
-- the last name. One-word names are left without one, to be asked for later.
UPDATE "users"
SET "firstName" = split_part(btrim("name"), ' ', 1),
    "lastName" = NULLIF(btrim(substr(btrim("name"), length(split_part(btrim("name"), ' ', 1)) + 1)), '');

ALTER TABLE "users" ALTER COLUMN "firstName" SET NOT NULL;
