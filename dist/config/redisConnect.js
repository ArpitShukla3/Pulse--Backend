"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRedisHealth = exports.connectRedis = void 0;
const redis_1 = require("redis");
const redisUrl = process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;
const redisClient = (0, redis_1.createClient)({
    url: redisUrl
});
redisClient.on("error", (error) => {
    console.error("Redis client error:", error.message);
});
const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    await redisClient.ping();
    console.log("Redis connected");
};
exports.connectRedis = connectRedis;
const checkRedisHealth = async () => {
    if (!redisClient.isOpen) {
        throw new Error("Redis client is not connected");
    }
    await redisClient.ping();
};
exports.checkRedisHealth = checkRedisHealth;
exports.default = redisClient;
