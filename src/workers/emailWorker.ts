import { EachMessagePayload } from "kafkajs";
import { createConsumer } from "../kafka/client.js";
import {
  NotificationPayload,
  publishNotificationDlq
} from "../kafka/notifyProducers.js";
import { NOTIFY_TOPICS } from "../kafka/notifyTopics.js";
import sendEmail from "../notification/emailSender.js";

const emailConsumer = createConsumer("notify-email-group");

type LegacyEmailPayload = {
  channel: "email";
  payload: {
    addr: string;
    message: string;
    subject?: string;
  };
};

const parsePayload = (message: EachMessagePayload["message"]): NotificationPayload | LegacyEmailPayload | null => {
  if (!message.value) {
    return null;
  }

  return JSON.parse(message.value.toString()) as NotificationPayload | LegacyEmailPayload;
};

const normalizeEmailPayload = (
  payload: NotificationPayload | LegacyEmailPayload
): { addr: string; subject?: string; content: string; raw: unknown } => {
  if ("payload" in payload) {
    return {
      addr: payload.payload.addr,
      subject: payload.payload.subject,
      content: payload.payload.message,
      raw: payload
    };
  }

  return {
    addr: payload.addr,
    subject: payload.subject,
    content: payload.content,
    raw: payload
  };
};

export const startEmailWorker = async (): Promise<void> => {
  await emailConsumer.connect();
  await emailConsumer.subscribe({
    topic: NOTIFY_TOPICS.EMAIL,
    fromBeginning: false
  });

  await emailConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const payload = parsePayload(message);

      if (!payload) {
        return;
      }

      const normalizedPayload = normalizeEmailPayload(payload);

      try {
        console.log("Email Worker received message:", normalizedPayload.raw);
        await sendEmail(
          normalizedPayload.addr,
          normalizedPayload.subject || "no-Reply",
          normalizedPayload.content
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unknown email worker failure";

        await publishNotificationDlq({
          sourceTopic: topic,
          sourcePartition: partition,
          sourceOffset: message.offset,
          reason,
          failedAt: new Date().toISOString(),
          message: normalizedPayload.raw
        });

        console.error("Email Worker sent message to DLQ:", reason);
      }
    }
  });
};
