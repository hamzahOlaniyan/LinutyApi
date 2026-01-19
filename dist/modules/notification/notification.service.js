"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../config/prisma");
class NotificationService {
    static async create(input) {
        const { recipientId, senderId = null, type, postId = null, requestId = null, commentId = null, lineageId = null, messageId = null, } = input;
        // avoid self-notifications
        if (senderId && senderId === recipientId)
            return null;
        return prisma_1.prisma.notification.create({
            data: {
                recipientId,
                senderId,
                type,
                postId,
                requestId,
                commentId,
                lineageId,
                messageId,
            }
        });
    }
    static async friendRequest(recipientId, senderId, requestId) {
        return this.create({
            recipientId,
            senderId,
            requestId,
            type: client_1.NotificationType.FRIEND_REQUEST
        });
    }
    static async likePost(recipientId, senderId, postId) {
        return this.create({
            recipientId,
            senderId,
            postId,
            type: client_1.NotificationType.LIKE
        });
    }
    static async likeComment(recipientId, senderId, postId, commentId) {
        return this.create({
            recipientId,
            senderId,
            postId,
            commentId,
            type: client_1.NotificationType.LIKE
        });
    }
    static async comment(recipientId, senderId, postId, commentId) {
        return this.create({
            recipientId,
            senderId,
            postId,
            commentId,
            type: client_1.NotificationType.COMMENT
        });
    }
    static async message(recipientId, senderId, messageId) {
        return this.create({
            recipientId,
            senderId,
            messageId,
            type: client_1.NotificationType.MESSAGE
        });
    }
    static async lineageInvite(recipientId, senderId, lineageId) {
        return this.create({
            recipientId,
            senderId,
            lineageId,
            type: client_1.NotificationType.LINEAGE_INVITE
        });
    }
    static async lineageAccept(recipientId, senderId, lineageId) {
        return this.create({
            recipientId,
            senderId,
            lineageId,
            type: client_1.NotificationType.LINEAGE_ACCEPT
        });
    }
}
exports.NotificationService = NotificationService;
