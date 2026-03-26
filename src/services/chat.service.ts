import { ChatMessageType } from "@prisma/client";
import prisma from "../config/prisma";
export async function recentChats(userId: number) {
    const conversations = await prisma.directConversationPair.findMany({
        where: {
        OR: [{
            user1Id: userId
        }, {
            user2Id: userId     
        }]}
        });
    const chatProfiles = await Promise.all(conversations.map(async ({ conversationId, user1Id, user2Id }) => {
        const otherUserId = user1Id === userId ? user2Id : user1Id;
        const otherUser = await prisma.user.findUnique({
            where: {
                id: otherUserId
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        });
        return {
            conversationId,
            user: otherUser
        };
    }));
    return chatProfiles;
} 
// select conversation_id 
export async function createNewChat(userId: number, recipientId: number) : Promise<number> {
    const minm = Math.min(userId, recipientId);
    const maxm = Math.max(userId, recipientId);
    const existingChat = await prisma.directConversationPair.findFirst({
        where: {
            user1Id: minm,
            user2Id: maxm
        }
    });
    if(existingChat) {
        return existingChat.conversationId;
    }
    const creatingConversation = await prisma.conversation.create({
        data: {
            type: "direct",
            createdBy: {
                connect: {
                    id: userId
                }
            }
        }
    });
    const creatingConversationParticipants = await prisma.conversationParticipant.create({
        data: {
            conversationId: creatingConversation.id,
            userId: userId
        }
    });
    const creatingConversationParticipants2 = await prisma.conversationParticipant.create({
        data: {
            conversationId: creatingConversation.id,
            userId: recipientId
        }
    });
    const newChat = await prisma.directConversationPair.create({
        data: {
            conversationId: creatingConversation.id,
            user1Id: minm,
            user2Id: maxm
        }
    });
    return newChat.conversationId;
}
export async function pushMessage(conversationId: number, userId: number, content: string, messageType: ChatMessageType) {
    const conversationExists = await prisma.conversation.findUnique({
        where: {
            id: conversationId
        }
    });
    if(!conversationExists) {
        return null;
    }
    const newMessage = await prisma.message.create({
        data: {
            conversationId,
            senderId: userId,
            content,
            messageType
        }
    });
    return newMessage.id;
}
export async function getChatMessages(conversationId: number, userId: number, offSet: number) {
    const conversationExists = await prisma.conversation.findUnique({
        where: {
            id: conversationId
        }
    });
    if(!conversationExists) {
        return null;
    }
    const isParticipant = await prisma.conversationParticipant.findFirst({
        where: {
            conversationId,
            userId
        }
    });
    if(!isParticipant) {
        return null;
    }
    const messages = await prisma.message.findMany({
        where: {
            conversationId
        },
        orderBy: {
            createdAt: "asc"
        },
        skip: offSet,
        take: 20
    });
    return messages;
}