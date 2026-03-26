import { producer } from "./client.js";
import { NOTIFY_TOPICS } from "./notifyTopics.js";
// const buildMessageKey = (payload: NotificationPayload): string =>
//   `${payload.channel}:${payload.addr}:${payload.typeOfMessage}`;
export const publishNotificationRequested = async (payload) => {
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
export const publishKafka = async (topic, payload) => {
    await producer.send({
        topic,
        messages: [
            {
                value: JSON.stringify(payload)
            }
        ]
    });
};
export const publishNotificationDlq = async (payload) => {
    await publishKafka(NOTIFY_TOPICS.DLQ, payload);
};
