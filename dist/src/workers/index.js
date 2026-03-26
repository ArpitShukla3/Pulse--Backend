import { startEmailWorker } from "./emailWorker.js";
import { startRouterWorker } from "./routerWorker.js";
import { startSmsWorker } from "./smsWorker.js";
export const startNotificationWorkers = async () => {
    await Promise.all([startRouterWorker(), startEmailWorker(), startSmsWorker()]);
};
