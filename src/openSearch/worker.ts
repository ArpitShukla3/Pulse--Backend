import { createConsumer } from "../kafka/client";
import { NOTIFY_TOPICS } from "../kafka/notifyTopics";
import { extractUserPayload, indexUserDocument } from "./syncUser";

const consumer1 = createConsumer("opensearch-worker-group");
const consumer2 = createConsumer("opensearch-worker-group");
const consumer3 = createConsumer("opensearch-worker-group");

export const startOpenSearchWorker = async (): Promise<void> => {
    await consumer1.connect();
    await consumer1.subscribe({ topic: NOTIFY_TOPICS.USER_CREATED, fromBeginning: true });

    await consumer1.run({
        eachMessage: async ({ topic, partition, message }) => {
            const jsonString = Buffer.from(message.value).toString("utf-8");
            const data = JSON.parse(jsonString);
            const { name, email, id, version } = extractUserPayload(data);
            await indexUserDocument({ name, email, id, version });
            console.log(`Received user.created event for user ${name} with email ${email} and id ${id} at version ${version}`);
        }
    });
    //   await consumer2.connect();
    //   await consumer2.subscribe({ topic: NOTIFY_TOPICS.USER_DELETED, fromBeginning: true });

    //   await consumer2.run({
    //     eachMessage: async ({ topic, partition, message }) => {
    //         const {name, email, id,version} = extractUserPayload(message);
    //         console.log(`Received user.deleted event for user ${name} with email ${email} and id ${id} at version ${version}`);
    //     }
    //   });
    //   await consumer3.connect();
    //   await consumer3.subscribe({ topic: NOTIFY_TOPICS.USER_UPDATED, fromBeginning: true });

    //   await consumer3.run({
    //     eachMessage: async ({ topic, partition, message }) => {
    //         const {name, email, id,version} = extractUserPayload(message);
    //         console.log(`Received user.updated event for user ${name} with email ${email} and id ${id} at version ${version}`);
    //     }
    //   });
}
