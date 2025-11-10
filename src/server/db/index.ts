import { Pool } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Create the neon connection pool (supports transactions)
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// Create the drizzle instance with the neon client and schema
export const db = drizzle(pool, { schema });