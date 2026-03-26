import { publishNotificationRequested } from "../kafka/notifyProducers.js";
export const notify = async (payload) => {
    await publishNotificationRequested(payload);
};
