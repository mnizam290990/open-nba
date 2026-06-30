/**
 * CI dry-run: verifies pending migrations can be generated without error.
 * Does NOT apply changes to the database.
 */
import { execSync } from "child_process";

try {
  execSync("drizzle-kit generate --check", { stdio: "inherit" });
  console.log("Migration check passed — no schema drift detected.");
  process.exit(0);
} catch (err) {
  console.error("Migration check FAILED — schema drift detected. Run `pnpm db:migrate` locally.");
  process.exit(1);
}
