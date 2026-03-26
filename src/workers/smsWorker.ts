import { EachMessagePayload } from "kafkajs";
import { createConsumer } from "../kafka/client.js";
import { NotificationPayload } from "../kafka/notifyProducers.js";
import { NOTIFY_TOPICS } from "../kafka/notifyTopics.js";
import sendSMS from "../notification/smsSender.js";

const smsConsumer = createConsumer("notify-sms-group");

const parsePayload = (message: EachMessagePayload["message"]): NotificationPayload | null => {
  if (!message.value) {
    return null;
  }

  return JSON.parse(message.value.toString()) as NotificationPayload;
};

export const startSmsWorker = async (): Promise<void> => {
  await smsConsumer.connect();
  await smsConsumer.subscribe({
    topic: NOTIFY_TOPICS.SMS,
    fromBeginning: false
  });

  await smsConsumer.run({
    eachMessage: async ({ message }) => {
      const payload = parsePayload(message);

      if (!payload) {
        return;
      }

      await sendSMS({
        mobile: payload.addr,
        message: payload.content
      });
    }
  });
};
