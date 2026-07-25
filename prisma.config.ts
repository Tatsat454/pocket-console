import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI config (replaces package.json#prisma).
 * DATABASE_URL stays in schema.prisma via env("DATABASE_URL").
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
