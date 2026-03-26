import { producer } from "./client.js";
import { NOTIFY_TOPICS } from "./notifyTopics.js";

export type NotificationChannel = "email" | "sms";

export type NotificationPayload = {
  typeOfMessage: string;
  channel: NotificationChannel;
  content: string;
  addr: string;
  subject?: string;
  metadata?: Record<string, string>;
};

export type NotificationDlqPayload = {
  sourceTopic: string;
  sourcePartition: number;
  sourceOffset: string;
  reason: string;
  failedAt: string;
  message: unknown;
};

// const buildMessageKey = (payload: NotificationPayload): string =>
//   `${payload.channel}:${payload.addr}:${payload.typeOfMessage}`;

export const publishNotificationRequested = async (
  payload: NotificationPayload
): Promise<void> => {
  await producer.send({
    topic: NOTIFY_TOPICS.REQUESTED,
    messages: [
      {
        // key: buildMessageKey(payload),
        value: JSON.stringify(payload)
      }
    ]
  });
};

export const publishKafka = async (
  topic: string,
  payload: object
): Promise<void> => {
  await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify(payload)
      }
    ]
  });
};

export const publishNotificationDlq = async (
  payload: NotificationDlqPayload
): Promise<void> => {
  await publishKafka(NOTIFY_TOPICS.DLQ, payload);
};


export const publishUserSync = async (payload: object): Promise<void> => {
  await publishKafka(NOTIFY_TOPICS.USER_CREATED, payload);
  console.log(`Published user.created event with payload: ${JSON.stringify(payload)}`);
}