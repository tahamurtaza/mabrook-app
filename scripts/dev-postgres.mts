/**
 * A local Postgres for development, with nothing to install.
 *
 * PGlite is a real Postgres compiled to WASM; the socket server puts it behind
 * the normal Postgres wire protocol, so Prisma, `pg` and `psql` all connect to
 * it exactly as they would to a server. Data lives in `.pglite/`.
 *
 *   npm run db:local        # start it, leave it running
 *
 * This is a dev convenience only. Railway provides the real Postgres in
 * production, and nothing outside this script imports PGlite.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.PGLITE_PORT ?? 5432);
const DATA_DIR = process.env.PGLITE_DIR ?? "./.pglite";

const db = await PGlite.create(DATA_DIR);
const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: "127.0.0.1",
  // Defaults to 1, which the dev server's connection pool blows through
  // immediately — every request then dies with `ConnectionClosed`. Queries are
  // still serialised inside PGlite; this only allows the sockets to stay open.
  maxConnections: 20,
});

await server.start();
console.log(`Postgres (PGlite) listening on 127.0.0.1:${PORT}, data in ${DATA_DIR}`);
console.log(`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres"`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
}
