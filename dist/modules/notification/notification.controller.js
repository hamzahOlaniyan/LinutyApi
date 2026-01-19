"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const prisma_1 = require("../../config/prisma");
// GET /notifications?limit=20&cursor=<id>
exports.NotificationController = {
    async getMyNotifications(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthenticated" });
            // find profile
            const profile = await prisma_1.prisma.profile.findUnique({
                where: { userId }
            });
            if (!profile) {
                return res.status(404).json({ message: "Profile not found" });
            }
            // const limit = Math.min(Number(req.query.limit) || 20, 50);
            // const cursor = req.query.cursor as string | undefined;
            const notifications = await prisma_1.prisma.notification.findMany({
                where: { recipientId: profile.id },
                // take: limit + 1,
                // ...(cursor
                //   ? {
                //       cursor: { id: cursor },
                //       skip: 1
                //     }
                //   : {}),
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
                    },
                    post: {
                        select: {
                            id: true,
                            content: true
                        }
                    },
                    comment: {
                        select: {
                            id: true,
                            content: true
                        }
                    },
                    message: {
                        select: {
                            id: true,
                            content: true
                        }
                    },
                    // lineage: {
                    //   select: {
                    //     id: true,
                    //     name: true
                    //   }
                    // }
                }
            });
            // let nextCursor: string | null = null;
            // if (notifications.length > limit) {
            //   const last = notifications.pop();
            //   nextCursor = last?.id ?? null;
            // }
            return res.json({
                data: notifications,
                // nextCursor
            });
        }
        catch (error) {
            console.error("getMyNotifications error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    async getNotificationCount(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthenticated" });
            const profile = await prisma_1.prisma.profile.findUnique({
                where: { userId },
                select: { id: true }
            });
            if (!profile)
                return res.status(404).json({ message: "Profile not found" });
            const count = await prisma_1.prisma.notification.count({ where: {
                    recipientId: profile.id, isRead: false
                } });
            return res.json(count);
        }
        catch (error) {
            console.error("getNotificationCount error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    // PATCH /notifications/:id/read
    async markNotificationRead(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthenticated" });
            const { id } = req.params;
            const profile = await prisma_1.prisma.profile.findUnique({
                where: { userId }
            });
            if (!profile) {
                return res.status(404).json({ message: "Profile not found" });
            }
            const notif = await prisma_1.prisma.notification.findUnique({ where: { id } });
            if (!notif || notif.recipientId !== profile.id) {
                return res.status(404).json({ message: "Notification not found" });
            }
            const updated = await prisma_1.prisma.notification.update({
                where: { id },
                data: { isRead: true }
            });
            return res.json(updated);
        }
        catch (error) {
            console.error("markNotificationRead error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    // // PATCH /notifications/read-all
    async markAllNotificationsRead(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ message: "Unauthenticated" });
            const profile = await prisma_1.prisma.profile.findUnique({
                where: { userId }
            });
            if (!profile) {
                return res.status(404).json({ message: "Profile not found" });
            }
            await prisma_1.prisma.notification.updateMany({
                where: {
                    recipientId: profile.id,
                    isRead: false
                },
                data: {
                    isRead: true
                }
            });
            return res.json({ message: "All notifications marked as read" });
        }
        catch (error) {
            console.error("markAllNotificationsRead error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
};
