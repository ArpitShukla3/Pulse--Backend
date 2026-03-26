import { EachMessagePayload } from "kafkajs";
import { createConsumer } from "../kafka/client.js";
import { NOTIFY_TOPICS } from "../kafka/notifyTopics.js";
import prisma from "../config/prisma.js";
import { ChatMessageType } from "@prisma/client";

const chatConsumer = createConsumer("chat-message-persister");

// Shape published by the thinClient
interface ThinClientChatMessage {
    type: string;        // "chat"
    from: string;        // sender userId (string)
    to: string;          // recipient userId (string)
    message: string;     // text content
    conversationId?: string | number;
    messageType?: string;
}

const isValidMessageType = (t: string): t is ChatMessageType =>
    Object.values(ChatMessageType).includes(t as ChatMessageType);

export const startChatMessageWorker = async (): Promise<void> => {
    await chatConsumer.connect();
    await chatConsumer.subscribe({
        topic: NOTIFY_TOPICS.CHAT_MESSAGES,
        fromBeginning: false,
    });

    await chatConsumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
            if (!message.value) return;

            let payload: ThinClientChatMessage;
            try {
                payload = JSON.parse(message.value.toString()) as ThinClientChatMessage;
            } catch {
                console.error("[chatMessageWorker] Failed to parse message:", message.value.toString());
                return;
            }

            if (payload.type !== "chat" || !payload.from || !payload.message) {
                return;
            }

            const senderId = parseInt(payload.from, 10);
            const conversationId = parseInt(String(payload.conversationId ?? "0"), 10);
            const messageType: ChatMessageType = isValidMessageType(payload.messageType ?? "")
                ? (payload.messageType as ChatMessageType)
                : ChatMessageType.text;

            if (isNaN(senderId) || isNaN(conversationId) || conversationId === 0) {
                console.warn("[chatMessageWorker] Missing or invalid senderId / conversationId, skipping.");
                return;
            }

            try {
                // Persist the message
                const newMessage = await prisma.message.create({
                    data: {
                        conversationId,
                        senderId,
                        content: payload.message,
                        messageType,
                    },
                });

                // Update conversation metadata
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: {
                        lastMessageId: newMessage.id,
                        lastMessageAt: newMessage.createdAt,
                    },
                });

                console.log(
                    `[chatMessageWorker] Persisted message ${newMessage.id} in conversation ${conversationId}`
                );
            } catch (err) {
                console.error("[chatMessageWorker] DB write failed:", err);
            }
        },
    });
};
