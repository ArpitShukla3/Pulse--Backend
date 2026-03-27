import { PrismaPg } from "@prisma/adapter-pg";
import * as PrismaClientPackage from "@prisma/client";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
const connectionString = process.env.DATABASE_URL 

const pool = new Pool({
  connectionString
});
const adapter = new PrismaPg(pool);
const { PrismaClient } = PrismaClientPackage;
const prisma = new PrismaClient({ adapter });

export default prisma;
