/**
 * CI script: verify that required security headers are configured in next.config.ts
 * Exits with code 1 if any required header is missing.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, "../next.config.ts");

const requiredHeaders = [
  "Content-Security-Policy",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Strict-Transport-Security",
];

let configContent;
try {
  configContent = readFileSync(configPath, "utf-8");
} catch {
  console.error(`ERROR: Cannot read ${configPath}`);
  process.exit(1);
}

let allPassed = true;

for (const header of requiredHeaders) {
  if (configContent.includes(header)) {
    console.log(`  PASS  ${header}`);
  } else {
    console.error(`  FAIL  ${header} — missing from next.config.ts`);
    allPassed = false;
  }
}

if (!allPassed) {
  console.error("\nSecurity header check FAILED. Add missing headers to next.config.ts.");
  process.exit(1);
}

console.log("\nAll required security headers are present.");
