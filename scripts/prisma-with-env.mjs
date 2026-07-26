/**
 * Run a Prisma CLI command with a fallback DATABASE_URL for generate/validate
 * during CI / Railway image builds (no live DB required for `generate`).
 */
import { spawnSync } from "node:child_process";

process.env.DATABASE_URL ??=
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/prisma-with-env.mjs <prisma args…>");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
