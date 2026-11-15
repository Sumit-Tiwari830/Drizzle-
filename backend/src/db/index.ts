import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
import * as schema from "./schema/index.js";

dotenv.config();

const { Pool } = pg;

const poolConfig: pg.PoolConfig = {
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dating_app",
  max: 30, // Optimized connection pool size for high concurrency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("neon.tech")) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
