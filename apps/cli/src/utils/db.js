import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../schema";

const db = drizzle(`file:${process.env.DB_PATH || "./db/db.sqlite"}`, {
  schema,
});

if (process.env.DB_MIGRATIONS_APPLY == "true") {
  await migrate(db, { migrationsFolder: "./migrations" });
}

export { db, schema };
