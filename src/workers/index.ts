import { startEmailWorker } from "./emailWorker.js";
import { startRouterWorker } from "./routerWorker.js";
import { startSmsWorker } from "./smsWorker.js";
import { startChatMessageWorker } from "./chatMessageWorker.js";

export const startNotificationWorkers = async (): Promise<void> => {
  await Promise.all([
    startRouterWorker(),
    startEmailWorker(),
    startSmsWorker(),
    startChatMessageWorker(),
  ]);
};
