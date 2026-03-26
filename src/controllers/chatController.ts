import { Request, Response } from "express";
import { UserRequest } from "../utils/types";
import { createNewChat, getChatMessages, pushMessage, recentChats } from "../services/chat.service";
import { ChatMessageType } from "@prisma/client";

export async function getAllChats(req: Request, res: Response) {
    const UserReq = req as UserRequest;
    const userId = UserReq.user.id;
    if(!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
    }
    const response = await recentChats(userId);
    res.json({ chats: response });
}
export async function createChat(req: Request, res: Response) : Promise<void> {
    const UserReq = req as UserRequest;
    const userId = UserReq.user.id;
    const { recipientId } = req.body;

    if (!recipientId) {
        res.status(400).json({ message: "Recipient ID is required" });
        return;
    }
    const conversationId = await createNewChat(userId, recipientId);
    res.json({ conversationId: conversationId });
}

export async function sendMessage(req: Request, res: Response) : Promise<void> {
    const UserReq = req as UserRequest;
    const userId = UserReq.user.id;
    const conversationId = req.params.id;
    const { content, messageType } = req.body;
    if (!content || !messageType || !conversationId || typeof content !== 'string' || !Object.values(ChatMessageType).includes(messageType as ChatMessageType || Array.isArray(conversationId) ))   {
        res.status(400).json({ message: "Content and message type are required and must be strings" });
        return;
    }
    // TODO: validate the message type and content based on the type
    // TODO: based on the messageType handle it differently
    const messageSentID = await pushMessage(parseInt(conversationId), userId, content, messageType);
    res.json({ messageID: messageSentID });
}
export const getThisChat = async (req: Request, res: Response) => {
    const UserReq = req as UserRequest;
    const userId = UserReq.user.id;
    const conversationId = req.params.id;
    const offSet = req.query.offset ? parseInt(req.query.offset as string) : 0;
    if (!conversationId) {
        res.status(400).json({ message: "Conversation ID is required" });
        return;
    }
    const allMessages = await getChatMessages(parseInt(conversationId), userId, offSet);
    return res.json({ messages: allMessages });
}