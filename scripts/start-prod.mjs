/**
 * Production entry for Railway:
 * 1) Require a real DATABASE_URL (linked Postgres)
 * 2) Sync schema
 * 3) Start Next + Socket.IO host
 */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL. In Railway: add PostgreSQL, then Variables → Add Reference → DATABASE_URL.",
  );
  process.exit(1);
}

const push = spawnSync("npx", ["prisma", "db", "push"], {
  stdio: "inherit",
  env: process.env,
});
if (push.status !== 0) process.exit(push.status ?? 1);

process.env.NODE_ENV = "production";
const server = spawnSync("npx", ["tsx", "server/index.ts"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(server.status ?? 1);
