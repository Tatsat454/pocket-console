import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI loads this file before validating schema.prisma.
 * Provide a non-connecting placeholder so `prisma generate` works on
 * Railway builds where DATABASE_URL is only available at runtime.
 * Runtime commands (db push / migrate) still use the real Railway URL
 * when DATABASE_URL is set.
 */
process.env.DATABASE_URL ??=
  "postgresql://build:build@127.0.0.1:5432/build?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
