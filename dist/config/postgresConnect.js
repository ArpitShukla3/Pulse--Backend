import { configDotenv } from "dotenv";
import pg from "pg";
const { Pool } = pg;
configDotenv();
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});
pool.on("error", (error) => {
    console.error("Postgres pool error:", error.message);
});
export const connectPostgres = async () => {
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
        console.log("Postgres connected");
    }
    finally {
        client.release();
    }
};
export const checkPostgresHealth = async () => {
    await pool.query("SELECT 1");
};
export default pool;
