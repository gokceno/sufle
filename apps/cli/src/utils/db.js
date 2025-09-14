import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../schema";

const db = drizzle(`file:${process.env.DB_PATH || "./db/db.sqlite"}`, {
  schema,
});

await migrate(db, { migrationsFolder: "./migrations" });

export { db, schema };
