import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

// Load environment variables before any application or database modules execute
const candidatePaths = [
  process.env.ENV_FILE,
  path.resolve(import.meta.dir, "../.env"),
  path.resolve(import.meta.dir, "../../.env"),
  path.resolve(process.cwd(), ".env"),
].filter(Boolean) as string[];

for (const envPath of candidatePaths) {
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }
}

export {};

