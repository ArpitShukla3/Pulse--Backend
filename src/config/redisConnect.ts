import { createClient } from "redis";

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

const redisClient = createClient({
  url: redisUrl
});

redisClient.on("error", (error: Error) => {
  console.error("Redis client error:", error.message);
});

export const connectRedis = async (): Promise<void> => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  await redisClient.ping();
  console.log("Redis connected");
};

export const checkRedisHealth = async (): Promise<void> => {
  if (!redisClient.isOpen) {
    throw new Error("Redis client is not connected");
  }

  await redisClient.ping();
};

export default redisClient;