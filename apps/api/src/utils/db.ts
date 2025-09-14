import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../schema";

const client = createClient({
  url: `file:${process.env.DB_PATH || "./db/db.sqlite"}`,
});

const db = drizzle(client, {
  schema,
});

await migrate(db, { migrationsFolder: "./migrations" });

export { db, client, schema };
