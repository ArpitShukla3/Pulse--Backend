import { Kafka } from "kafkajs";
import { NOTIFY_TOPICS } from "./notifyTopics.js";
import fs from "fs";

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "chat-backend",
  brokers: [process.env.KAFKA_BROKER || "localhost:9094"],
  ssl: {
    rejectUnauthorized: true,
    ca: [process.env.KAFKA_CA],
    key: process.env.KAFKA_KEY,
    cert: process.env.KAFKA_CERT
  },
});
export const producer = kafka.producer();
export const admin = kafka.admin();
export const createConsumer = (groupId: string) =>
  kafka.consumer({
    groupId
  });
export const ensureKafkaTopics = async (): Promise<void> => {
  await admin.connect();
  try {
    const existingTopics = new Set(await admin.listTopics());
    const missingTopics = Object.values(NOTIFY_TOPICS).filter((topic) => !existingTopics.has(topic));
    if (missingTopics.length === 0) {
      return;
    }
    await admin.createTopics({
      waitForLeaders: true,
      topics: missingTopics.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1
      }))
    });
  } finally {
    await admin.disconnect();
  }
};