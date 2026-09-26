// Applies schema.sql to DATABASE_URL. Usage: node --env-file=.env.local scripts/migrate.mjs
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
await pool.end();
console.log("Schema applied.");
