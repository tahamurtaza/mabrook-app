import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct connection; Neon's pooled one (DATABASE_URL,
    // which the app uses) can't hold the lock they take. Locally there's only
    // the one URL. Not `env()`, which throws: `prisma generate` runs in the
    // build and needs no database at all.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
