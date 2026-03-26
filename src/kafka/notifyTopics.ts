export const NOTIFY_TOPICS = {
  REQUESTED: process.env.KAFKA_NOTIFY_REQUESTED_TOPIC || "notify.requested",
  EMAIL: process.env.KAFKA_NOTIFY_EMAIL_TOPIC || "notify.email",
  SMS: process.env.KAFKA_NOTIFY_SMS_TOPIC || "notify.sms",
  DLQ: process.env.KAFKA_NOTIFY_DLQ_TOPIC || "notify.dlq",
  USER_CREATED: process.env.KAFKA_USER_CREATED_TOPIC || "user.created",
  USER_UPDATED: process.env.KAFKA_USER_UPDATED_TOPIC || "user.updated",
  USER_DELETED: process.env.KAFKA_USER_DELETED_TOPIC || "user.deleted",
  CHAT_MESSAGES: process.env.KAFKA_TOPIC || "chat.messages",
} as const;
