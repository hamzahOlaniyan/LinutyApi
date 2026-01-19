"use strict";
// src/modules/chat/chat.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversation = createConversation;
exports.listConversations = listConversations;
exports.sendMessage = sendMessage;
exports.getMessages = getMessages;
exports.markConversationRead = markConversationRead;
const notification_service_1 = require("../notification/notification.service");
const prisma_1 = require("../../config/prisma");
/**
 * Helper: get the current profile using Supabase user id
 */
async function getCurrentProfile(req) {
    const userId = req.user?.id;
    if (!userId)
        return null;
    return prisma_1.prisma.profile.findUnique({
        where: { userId }
    });
}
/**
 * POST /conversations
 * body:
 *  - usernames: string[]      // usernames of other participants
 *  - isGroup?: boolean        // default false
 *  - title?: string           // group title if isGroup === true
 *
 * For 1:1 chats, we try to reuse an existing conversation.
 */
async function createConversation(req, res) {
    try {
        const me = await getCurrentProfile(req);
        if (!me)
            return res.status(401).json({ message: "Unauthenticated" });
        const { usernames, isGroup = false, title } = req.body;
        if (!Array.isArray(usernames) || usernames.length === 0) {
            return res.status(400).json({ message: "usernames is required" });
        }
        // resolve all other participants (exclude me, we add me manually)
        const participantsProfiles = await prisma_1.prisma.profile.findMany({
            where: {
                username: { in: usernames }
            }
        });
        if (participantsProfiles.length !== usernames.length) {
            return res
                .status(404)
                .json({ message: "One or more usernames not found" });
        }
        const allParticipantIds = [
            me.id,
            ...participantsProfiles.map((p) => p.id)
        ];
        // For 1:1 chats, reuse existing conversation if it already exists
        if (!isGroup && allParticipantIds.length === 2) {
            const existing = await prisma_1.prisma.conversation.findFirst({
                where: {
                    isGroup: false,
                    participants: {
                        every: {
                            profileId: { in: allParticipantIds }
                        }
                    }
                },
                include: {
                    participants: {
                        include: {
                            profile: {
                                select: {
                                    id: true,
                                    username: true,
                                    firstName: true,
                                    lastName: true,
                                    avatarUrl: true
                                }
                            }
                        }
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1
                    }
                }
            });
            if (existing) {
                return res.json(existing);
            }
        }
        const conversation = await prisma_1.prisma.conversation.create({
            data: {
                isGroup,
                title: isGroup ? title ?? null : null,
                createdById: me.id,
                participants: {
                    create: allParticipantIds.map((pid) => ({
                        profileId: pid,
                        role: pid === me.id ? "owner" : "member"
                    }))
                }
            },
            include: {
                participants: {
                    include: {
                        profile: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                avatarUrl: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });
        return res.status(201).json(conversation);
    }
    catch (error) {
        console.error("createConversation error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * GET /conversations
 * List conversations for current user with:
 *  - participants
 *  - last message
 *  - unreadCount
 */
async function listConversations(req, res) {
    try {
        const me = await getCurrentProfile(req);
        if (!me)
            return res.status(401).json({ message: "Unauthenticated" });
        const conversations = await prisma_1.prisma.conversation.findMany({
            where: {
                participants: {
                    some: { profileId: me.id }
                }
            },
            orderBy: { createdAt: "desc" },
            include: {
                participants: {
                    include: {
                        profile: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                avatarUrl: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });
        const convoIds = conversations.map((c) => c.id);
        if (convoIds.length === 0) {
            return res.json([]);
        }
        // Unread messages per conversation (where current user hasn't read, and sender is not me)
        const unreadByConvo = await prisma_1.prisma.message.groupBy({
            by: ["conversationId"],
            where: {
                conversationId: { in: convoIds },
                senderId: { not: me.id },
                reads: {
                    none: {
                        userId: me.id
                    }
                }
            },
            _count: { _all: true }
        });
        const unreadMap = new Map(unreadByConvo.map((g) => [g.conversationId, g._count._all]));
        const result = conversations.map((c) => ({
            ...c,
            unreadCount: unreadMap.get(c.id) ?? 0
        }));
        return res.json(result);
    }
    catch (error) {
        console.error("listConversations error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * POST /conversations/:id/messages
 * body:
 *  - content?: string;
 *  - mediaUrl?: string;
 */
async function sendMessage(req, res) {
    try {
        const me = await getCurrentProfile(req);
        if (!me)
            return res.status(401).json({ message: "Unauthenticated" });
        const { id: conversationId } = req.params;
        const { content, mediaUrl } = req.body;
        if (!content && !mediaUrl) {
            return res.status(400).json({
                message: "Message must have content or mediaUrl"
            });
        }
        // Ensure user is participant in conversation
        const participant = await prisma_1.prisma.conversationParticipant.findFirst({
            where: {
                conversationId,
                profileId: me.id
            }
        });
        if (!participant) {
            return res
                .status(403)
                .json({ message: "You are not a participant in this conversation" });
        }
        const message = await prisma_1.prisma.message.create({
            data: {
                conversationId,
                senderId: me.id,
                content: content ?? null,
                mediaUrl: mediaUrl ?? null
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true
                    }
                }
            }
        });
        // Mark as read by sender
        await prisma_1.prisma.messageRead.create({
            data: {
                messageId: message.id,
                userId: me.id
            }
        });
        // Notify all other participants
        const otherParticipants = await prisma_1.prisma.conversationParticipant.findMany({
            where: {
                conversationId,
                profileId: { not: me.id }
            },
            select: { profileId: true }
        });
        await Promise.all(otherParticipants.map((p) => notification_service_1.NotificationService.message(p.profileId, me.id, message.id)));
        return res.status(201).json(message);
    }
    catch (error) {
        console.error("sendMessage error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * GET /conversations/:id/messages?limit=30&cursor=<messageId>
 * Paginated messages for one conversation.
 */
async function getMessages(req, res) {
    try {
        const me = await getCurrentProfile(req);
        if (!me)
            return res.status(401).json({ message: "Unauthenticated" });
        const { id: conversationId } = req.params;
        const limit = Math.min(Number(req.query.limit) || 30, 100);
        const cursor = req.query.cursor;
        // Ensure user is participant
        const participant = await prisma_1.prisma.conversationParticipant.findFirst({
            where: {
                conversationId,
                profileId: me.id
            }
        });
        if (!participant) {
            return res
                .status(403)
                .json({ message: "You are not a participant in this conversation" });
        }
        const messages = await prisma_1.prisma.message.findMany({
            where: { conversationId },
            take: limit + 1,
            ...(cursor
                ? {
                    cursor: { id: cursor },
                    skip: 1
                }
                : {}),
            orderBy: { createdAt: "desc" },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true
                    }
                }
            }
        });
        let nextCursor = null;
        if (messages.length > limit) {
            const last = messages.pop();
            nextCursor = last?.id ?? null;
        }
        // Mark returned messages as read by this user
        const messageIds = messages.map((m) => m.id);
        if (messageIds.length > 0) {
            await prisma_1.prisma.messageRead.createMany({
                data: messageIds.map((mid) => ({
                    messageId: mid,
                    userId: me.id
                })),
                skipDuplicates: true
            });
            await prisma_1.prisma.conversationParticipant.update({
                where: { id: participant.id },
                data: { lastReadAt: new Date() }
            });
        }
        return res.json({
            data: messages.reverse(), // oldest first
            nextCursor
        });
    }
    catch (error) {
        console.error("getMessages error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
/**
 * POST /conversations/:id/read
 * Mark entire conversation as read (all messages).
 */
async function markConversationRead(req, res) {
    try {
        const me = await getCurrentProfile(req);
        if (!me)
            return res.status(401).json({ message: "Unauthenticated" });
        const { id: conversationId } = req.params;
        // Ensure user is participant
        const participant = await prisma_1.prisma.conversationParticipant.findFirst({
            where: {
                conversationId,
                profileId: me.id
            }
        });
        if (!participant) {
            return res
                .status(403)
                .json({ message: "You are not a participant in this conversation" });
        }
        const messages = await prisma_1.prisma.message.findMany({
            where: { conversationId },
            select: { id: true }
        });
        const messageIds = messages.map((m) => m.id);
        if (messageIds.length > 0) {
            await prisma_1.prisma.messageRead.createMany({
                data: messageIds.map((mid) => ({
                    messageId: mid,
                    userId: me.id
                })),
                skipDuplicates: true
            });
        }
        await prisma_1.prisma.conversationParticipant.update({
            where: { id: participant.id },
            data: { lastReadAt: new Date() }
        });
        return res.json({ message: "Conversation marked as read" });
    }
    catch (error) {
        console.error("markConversationRead error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
