import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// Next.js clears the module cache on every hot reload in development, which
// would otherwise open a new connection pool per edit until Postgres refuses.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

function getClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

/**
 * The database client, connected on first use rather than on import.
 *
 * `next build` imports every route module to read its config, so an eager
 * client would make the build require a live DATABASE_URL — breaking CI and any
 * platform that only injects variables at deploy time. Deferring means a
 * missing URL surfaces on the first query, with the same clear message.
 */
export const prisma = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, property, receiver) {
    return Reflect.get(getClient(), property, receiver);
  },
});
