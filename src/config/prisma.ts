import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();
const connectionString = process.env.DATABASE_URL 

const pool = new Pool({
  connectionString
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;

export const checkPostgresHealth = async (): Promise<void> => {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Postgres healthcheck error";
    throw new Error(`Postgres healthcheck failed: ${message}`);
  }
}