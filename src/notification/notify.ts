import {
  NotificationPayload,
  publishNotificationRequested
} from "../kafka/notifyProducers.js";

export const notify = async (payload: NotificationPayload): Promise<void> => {
  await publishNotificationRequested(payload);
};
