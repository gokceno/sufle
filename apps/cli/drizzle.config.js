import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  dbCredentials: {
    url: `./db/db.sqlite`,
  },
  schema: `./src/schema.js`,
  out: `./migrations/`,
  dialect: "sqlite",
});
