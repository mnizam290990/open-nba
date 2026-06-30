/**
 * Destructive reset: truncates all tables in dependency order and re-seeds.
 * Only run in development environments.
 */
import { db } from "./client";
import {
  auditLog,
  nbaActionLog,
  nbaCards,
  pipelineRuns,
  mrFeedback,
  visitLogs,
  offerCatalog,
  hcpProfiles,
  mrProfiles,
  sessions,
  accounts,
  verificationTokens,
  users,
} from "./schema";

if (process.env.NODE_ENV === "production") {
  console.error("ERROR: db:reset must not be run in production!");
  process.exit(1);
}

async function main() {
  console.log("Resetting database (DESTRUCTIVE)…");

  await db.delete(auditLog);
  await db.delete(nbaActionLog);
  await db.delete(nbaCards);
  await db.delete(pipelineRuns);
  await db.delete(mrFeedback);
  await db.delete(visitLogs);
  await db.delete(offerCatalog);
  await db.delete(hcpProfiles);
  await db.delete(mrProfiles);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(verificationTokens);
  await db.delete(users);

  console.log("All tables cleared. Run `pnpm db:seed` to repopulate.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
