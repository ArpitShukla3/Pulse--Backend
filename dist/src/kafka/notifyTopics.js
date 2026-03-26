export const NOTIFY_TOPICS = {
    REQUESTED: process.env.KAFKA_NOTIFY_REQUESTED_TOPIC || "notify.requested",
    EMAIL: process.env.KAFKA_NOTIFY_EMAIL_TOPIC || "notify.email",
    SMS: process.env.KAFKA_NOTIFY_SMS_TOPIC || "notify.sms",
    DLQ: process.env.KAFKA_NOTIFY_DLQ_TOPIC || "notify.dlq"
};
