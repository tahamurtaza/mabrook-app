import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// Next.js clears the module cache on every hot reload in development, which
// would otherwise open a new connection pool per edit until Postgres refuses.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
