import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { checkPostgresHealth, connectPostgres } from "./config/postgresConnect.js";
import prisma from "./config/prisma.js";
import { checkRedisHealth, connectRedis } from "./config/redisConnect.js";
import { ensureKafkaTopics, producer } from "./kafka/client.js";
import authRouter from "./routes/authRoutes.js";
import { startNotificationWorkers } from "./workers/index.js";
import { ensureUsersIndex } from "./openSearch/userIndexer.js";
import populateOpenSearch from "./scripts/populateOpensearch.js";
import { startOpenSearchWorker } from "./openSearch/worker.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Chat backend server is running",
    healthcheck: "/health"
  });
});
 
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await Promise.all([checkPostgresHealth(), checkRedisHealth()]);

    res.status(200).json({
      status: "ok",
      services: {
        postgres: "up",
        redis: "up"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown healthcheck error";

    res.status(503).json({
      status: "error",
      message
    });
  }
});

const startServer = async (): Promise<void> => {
  try {
    await Promise.all([connectPostgres(), connectRedis(), prisma.$connect()]);
    await ensureKafkaTopics();
    await Promise.all([producer.connect(),startNotificationWorkers(),ensureUsersIndex(),startOpenSearchWorker() ]);
    // await populateOpenSearch();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown startup error";

    console.error("Failed to start server:", message);
    process.exit(1);
  }
};

void startServer();
