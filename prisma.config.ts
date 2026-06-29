import { defineConfig } from "prisma/config";
import { readFileSync } from "fs";
import { join } from "path";

let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  databaseUrl = databaseUrl.replace(/^["']|["']$/g, "").trim();
} else {
  try {
    const envPath = join(process.cwd(), ".env");
    const envFile = readFileSync(envPath, "utf-8");
    const match = envFile.match(/^DATABASE_URL=["']?(.*?)["']?$/m);
    if (match) {
      databaseUrl = match[1].replace(/^["']|["']$/g, "").trim();
    }
  } catch (e) {
    // Ignore if .env doesn't exist
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
