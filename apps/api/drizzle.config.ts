import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url: `./db/db.sqlite`,
  },
  schema: `./src/schema.ts`,
  out: `./migrations/`,
  dialect: "sqlite",
});
