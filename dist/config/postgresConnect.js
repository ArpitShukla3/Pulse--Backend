"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPostgresHealth = exports.connectPostgres = void 0;
const dotenv_1 = require("dotenv");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
(0, dotenv_1.configDotenv)();
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
const connectPostgres = async () => {
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
        console.log("Postgres connected");
    }
    finally {
        client.release();
    }
};
exports.connectPostgres = connectPostgres;
const checkPostgresHealth = async () => {
    await pool.query("SELECT 1");
};
exports.checkPostgresHealth = checkPostgresHealth;
exports.default = pool;
