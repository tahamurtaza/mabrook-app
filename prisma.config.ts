import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Not `env()`, which throws: `prisma generate` runs during the build and
    // needs no database, and the commands that do will say so themselves.
    url: process.env.DATABASE_URL ?? "",
  },
});
