"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendsController = void 0;
const prisma_1 = require("../../config/prisma");
const notification_service_1 = require("../notification/notification.service");
async function getCurrentProfile(req) {
    const userId = req.user?.id;
    if (!userId)
        return null;
    return prisma_1.prisma.profile.findUnique({
        where: { userId },
        select: { id: true }
    });
}
const pair = (a, b) => (a < b ? [a, b] : [b, a]);
class FriendsController {
    static async sendFriendRequest(req, res) {
        const me = await getCurrentProfile(req);
        if (!me?.id)
            return res.status(401).json({ message: "Unauthenticated" });
        const { profileId } = req.params;
        if (!profileId)
            return res.status(400).json({ message: "profileId is required" });
        if (profileId === me.id)
            return res.status(400).json({ message: "You can't add yourself" });
        const [userAId, userBId] = pair(me.id, profileId);
        const existingFriendship = await prisma_1.prisma.friendship.findUnique({
            where: { userAId_userBId: { userAId, userBId } },
        });
        if (existingFriendship)
            return res.status(409).json({ message: "Already friends" });
        // block duplicates + cross-requests
        const existingRequest = await prisma_1.prisma.friendRequest.findFirst({
            where: {
                status: "PENDING",
                OR: [
                    { requesterId: me.id, addresseeId: profileId },
                    { requesterId: profileId, addresseeId: me.id },
                ],
            },
        });
        if (existingRequest)
            return res.status(409).json({ message: "Request already pending" });
        const created = await prisma_1.prisma.friendRequest.create({
            data: { requesterId: me.id, addresseeId: profileId },
        });
        await notification_service_1.NotificationService.friendRequest(profileId, me.id, created.id);
        return res.status(201).json(created);
    }
    static async acceptFriendRequest(req, res) {
        const me = await getCurrentProfile(req);
        if (!me)
            return res.status(401).json({ message: "Unauthenticated" });
        const { requestId } = req.params;
        const request = await prisma_1.prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request)
            return res.status(404).json({ message: "Request not found" });
        if (request.addresseeId !== me.id)
            return res.status(403).json({ message: "Forbidden" });
        if (request.status !== "PENDING")
            return res.status(409).json({ message: "Request not pending" });
        const [userAId, userBId] = pair(request.requesterId, request.addresseeId);
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.friendRequest.update({
                where: { id: requestId },
                data: { status: "ACCEPTED", respondedAt: new Date() },
            });
            // create friendship (idempotent)
            const friendship = await tx.friendship.upsert({
                where: { userAId_userBId: { userAId, userBId } },
                update: {},
                create: { userAId, userBId },
            });
            return friendship;
        });
        return res.status(200).json(result);
    }
    static async declineFriendRequest(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { requestId } = req.params;
            const request = await prisma_1.prisma.friendRequest.findUnique({ where: { id: requestId } });
            if (!request)
                return res.status(404).json({ message: "Request not found" });
            if (request.addresseeId !== me.id)
                return res.status(403).json({ message: "Forbidden" });
            if (request.status !== "PENDING")
                return res.status(409).json({ message: "Request not pending" });
            const updated = await prisma_1.prisma.friendRequest.update({
                where: { id: requestId },
                data: { status: "DECLINED", respondedAt: new Date() },
            });
            return res.status(200).json(updated);
        }
        catch (error) {
            console.log("declineFriendRequest ❌", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
    static async cancelFriendRequest(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { profileId } = req.params;
            const request = await prisma_1.prisma.friendRequest.findFirst({
                where: {
                    requesterId: me.id,
                    addresseeId: profileId,
                    status: "PENDING",
                },
            });
            if (!request)
                return res.status(404).json({ message: "Pending request not found" });
            await prisma_1.prisma.friendRequest.update({
                where: { id: request.id },
                data: { status: "CANCELLED", respondedAt: new Date() },
            });
            return res.status(204).send();
        }
        catch (error) {
            console.log("cancelFriendRequest ❌", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
    static async unfriend(req, res) {
        try {
            const me = await getCurrentProfile(req);
            if (!me)
                return res.status(401).json({ message: "Unauthenticated" });
            const { profileId } = req.params;
            if (!profileId)
                return res.status(400).json({ message: "profileId is required" });
            if (profileId === me.id)
                return res.status(400).json({ message: "You can't unfriend yourself" });
            const [userAId, userBId] = pair(me.id, profileId);
            const existing = await prisma_1.prisma.friendship.findUnique({
                where: { userAId_userBId: { userAId, userBId } },
            });
            if (!existing)
                return res.status(404).json({ message: "Friendship not found" });
            await prisma_1.prisma.friendship.delete({
                where: { userAId_userBId: { userAId, userBId } },
            });
            return res.status(204).send();
        }
        catch (error) {
            console.log("unfriend ❌", error);
            return res.status(500).json({ message: "Server error" });
        }
    }
    static async getFriendsCount(req, res) {
        const { profileId } = req.params;
        if (!profileId)
            return res.status(400).json({ message: "profileId is required" });
        const count = await prisma_1.prisma.friendship.count({
            where: {
                OR: [{ userAId: profileId }, { userBId: profileId }],
            },
        });
        return res.json({ count });
    }
    static async getFriends(req, res) {
        try {
            const { profileId } = req.params;
            const friendships = await prisma_1.prisma.friendship.findMany({
                where: {
                    OR: [{ userAId: profileId }, { userBId: profileId }],
                },
                include: {
                    userA: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                            isVerified: true,
                        },
                    },
                    userB: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                            isVerified: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
            // Map each friendship to "the other person"
            const friends = friendships.map((f) => f.userAId === profileId ? f.userB : f.userA);
            // const unique = new Map<string, any>();
            // for (const p of friends) unique.set(p.id, p);
            // return res.json({ friends: [...unique.values()], count: unique.size });
            return res.json({ friends, count: friends.length });
        }
        catch (error) {
            console.error("getFriends error:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}
exports.FriendsController = FriendsController;
