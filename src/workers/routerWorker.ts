import { EachMessagePayload } from "kafkajs";
import { createConsumer } from "../kafka/client.js";
import {
  NotificationPayload,
  publishKafka,
} from "../kafka/notifyProducers.js";
import { NOTIFY_TOPICS } from "../kafka/notifyTopics.js";

const routerConsumer = createConsumer("notify-router-group");

const resolveTopicForChannel = (channel: NotificationPayload["channel"]): string => {
  switch (channel) {
    case "email":
      return NOTIFY_TOPICS.EMAIL;
    case "sms":
      return NOTIFY_TOPICS.SMS;
    default:
      throw new Error(`Unsupported notification channel: ${channel satisfies never}`);
  }
};

const parsePayload = (message: EachMessagePayload["message"]): NotificationPayload | null => {
  if (!message.value) {
    return null;
  }

  return JSON.parse(message.value.toString()) as NotificationPayload;
};

export const startRouterWorker = async (): Promise<void> => {
  await routerConsumer.connect();
  await routerConsumer.subscribe({
    topic: NOTIFY_TOPICS.REQUESTED,
    fromBeginning: false
  });

  await routerConsumer.run({
    eachMessage: async ({ message }) => {
      const payload = parsePayload(message);
      if (!payload) {
        return;
      }

      const topic = resolveTopicForChannel(payload.channel);
      await publishKafka(topic, payload);
    }
  });
};
