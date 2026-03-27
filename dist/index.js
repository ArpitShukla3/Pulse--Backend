"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const postgresConnect_js_1 = require("./config/postgresConnect.js");
const prisma_js_1 = __importDefault(require("./config/prisma.js"));
const redisConnect_js_1 = require("./config/redisConnect.js");
const client_js_1 = require("./kafka/client.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const index_js_1 = require("./workers/index.js");
const userIndexer_js_1 = require("./openSearch/userIndexer.js");
const worker_js_1 = require("./openSearch/worker.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3000);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/auth", authRoutes_js_1.default);
app.get("/", (_req, res) => {
    res.json({
        message: "Chat backend server is running",
        healthcheck: "/health"
    });
});
app.get("/health", async (_req, res) => {
    try {
        await Promise.all([(0, postgresConnect_js_1.checkPostgresHealth)(), (0, redisConnect_js_1.checkRedisHealth)()]);
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
        await Promise.all([(0, postgresConnect_js_1.connectPostgres)(), (0, redisConnect_js_1.connectRedis)(), prisma_js_1.default.$connect()]);
        await (0, client_js_1.ensureKafkaTopics)();
        await Promise.all([client_js_1.producer.connect(), (0, index_js_1.startNotificationWorkers)(), (0, userIndexer_js_1.ensureUsersIndex)(), (0, worker_js_1.startOpenSearchWorker)()]);
        // await populateOpenSearch();
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
