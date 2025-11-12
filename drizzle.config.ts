import { type Config } from "drizzle-kit";


export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  tablesFilter: ["pdr_ai_v2_*"],
} as Config;
