import { createConsumer } from "../kafka/client.js";
import { publishKafka, } from "../kafka/notifyProducers.js";
import { NOTIFY_TOPICS } from "../kafka/notifyTopics.js";
const routerConsumer = createConsumer("notify-router-group");
const resolveTopicForChannel = (channel) => {
    switch (channel) {
        case "email":
            return NOTIFY_TOPICS.EMAIL;
        case "sms":
            return NOTIFY_TOPICS.SMS;
        default:
            throw new Error(`Unsupported notification channel: ${channel}`);
    }
};
const parsePayload = (message) => {
    if (!message.value) {
        return null;
    }
    return JSON.parse(message.value.toString());
};
export const startRouterWorker = async () => {
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
