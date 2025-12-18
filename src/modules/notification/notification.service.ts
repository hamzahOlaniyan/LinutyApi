import { NotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma";

type CreateNotificationInput = {
  recipientId: string;        // Profile.id
  actorId?: string | null;    // Profile.id
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  lineageId?: string | null;
  messageId?: string | null;
};

export class NotificationService {
  static async create(input: CreateNotificationInput) {
    const {
      recipientId,
      actorId = null,
      type,
      postId = null,
      commentId = null,
      lineageId = null,
      messageId = null,
    } = input;

    // avoid self-notifications
    if (actorId && actorId === recipientId) return null;

    return prisma.notification.create({
      data: {
        recipientId,
        actorId,
        type,
        postId,
        commentId,
        lineageId,
        messageId,
      }
    });
  }

  // convenience methods

  static async follow(recipientId: string, actorId: string) {
    return this.create({
      recipientId,
      actorId,
      type: NotificationType.FOLLOW
    });
  }

  static async likePost(recipientId: string, actorId: string, postId: string) {
    return this.create({
      recipientId,
      actorId,
      postId,
      type: NotificationType.LIKE
    });
  }

  static async likeComment(
  recipientId: string,
  actorId: string,
  postId: string,
  commentId: string
) {
  return this.create({
    recipientId,
    actorId,
    postId,
    commentId,
    type: NotificationType.LIKE
  });
}


  static async comment(
    recipientId: string,
    actorId: string,
    postId: string,
    commentId: string
  ) {
    return this.create({
      recipientId,
      actorId,
      postId,
      commentId,
      type: NotificationType.COMMENT
    });
  }

  static async message(
    recipientId: string,
    actorId: string,
    messageId: string
  ) {
    return this.create({
      recipientId,
      actorId,
      messageId,
      type: NotificationType.MESSAGE
    });
  }

  static async lineageInvite(recipientId: string, actorId: string, lineageId: string) {
    return this.create({
      recipientId,
      actorId,
      lineageId,
      type: NotificationType.LINEAGE_INVITE
    });
  }

  static async lineageAccept(recipientId: string, actorId: string, lineageId: string) {
    return this.create({
      recipientId,
      actorId,
      lineageId,
      type: NotificationType.LINEAGE_ACCEPT
    });
  }
}
