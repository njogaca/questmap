import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("[migrate] OK");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] ERROR", err);
  process.exit(1);
});
