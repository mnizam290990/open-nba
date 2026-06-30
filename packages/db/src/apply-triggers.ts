/**
 * Applies custom SQL triggers that cannot be expressed in Drizzle ORM schema.
 * Run this AFTER drizzle-kit migrate to enforce append-only audit_log semantics.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "./client";
import { sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyTriggers() {
  const triggerSql = readFileSync(join(__dirname, "triggers.sql"), "utf-8");

  console.log("Applying custom SQL triggers…");
  await db.execute(sql.raw(triggerSql));
  console.log("Triggers applied successfully.");
  process.exit(0);
}

applyTriggers().catch((err) => {
  console.error("Failed to apply triggers:", err);
  process.exit(1);
});
