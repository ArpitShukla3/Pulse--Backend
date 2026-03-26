import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { checkPostgresHealth, connectPostgres } from "./config/postgresConnect.js";
import prisma from "./config/prisma.js";
import { checkRedisHealth, connectRedis } from "./config/redisConnect.js";
import { ensureKafkaTopics, producer } from "./kafka/client.js";
import authRouter from "./routes/authRoutes.js";
import { startNotificationWorkers } from "./workers/index.js";
dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.get("/", (_req, res) => {
    res.json({
        message: "Chat backend server is running",
        healthcheck: "/health"
    });
});
app.get("/health", async (_req, res) => {
    try {
        await Promise.all([checkPostgresHealth(), checkRedisHealth()]);
        res.status(200).json({
            status: "ok",
            services: {
                postgres: "up",
                redis: "up"
            }
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown healthcheck error";
        res.status(503).json({
            status: "error",
            message
        });
    }
});
const startServer = async () => {
    try {
        await Promise.all([connectPostgres(), connectRedis(), prisma.$connect()]);
        await Promise.all([producer.connect(), ensureKafkaTopics(), startNotificationWorkers()]);
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown startup error";
        console.error("Failed to start server:", message);
        process.exit(1);
    }
};
void startServer();
