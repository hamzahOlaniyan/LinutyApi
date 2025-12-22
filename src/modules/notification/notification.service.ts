import { NotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma";

type CreateNotificationInput = {
  recipientId: string;        // Profile.id
  senderId?: string | null; 
  type: NotificationType;
  postId?: string | null;
  requestId?:string  |null
  commentId?: string | null;
  lineageId?: string | null;
  messageId?: string | null;
};

export class NotificationService {
  static async create(input: CreateNotificationInput) {
    const {
      recipientId,
      senderId = null,
      type,
      postId = null,
      requestId=null,
      commentId = null,
      lineageId = null,
      messageId = null,
    } = input;

    // avoid self-notifications
    if (senderId && senderId === recipientId) return null;

    return prisma.notification.create({
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


  static async friendRequest(recipientId: string, senderId: string, requestId: string){
    return this.create({
      recipientId,
      senderId,
      requestId,
      type: NotificationType.FRIEND_REQUEST
    })

  }

  static async likePost(recipientId: string, senderId: string, postId: string) {
    return this.create({
      recipientId,
      senderId,
      postId,
      type: NotificationType.LIKE
    });
  }

  static async likeComment(
  recipientId: string,
  senderId: string,
  postId: string,
  commentId: string
) {
  return this.create({
    recipientId,
    senderId,
    postId,
    commentId,
    type: NotificationType.LIKE
  });
}


  static async comment(
    recipientId: string,
    senderId: string,
    postId: string,
    commentId: string
  ) {
    return this.create({
      recipientId,
      senderId,
      postId,
      commentId,
      type: NotificationType.COMMENT
    });
  }

  static async message(
    recipientId: string,
    senderId: string,
    messageId: string
  ) {
    return this.create({
      recipientId,
      senderId,
      messageId,
      type: NotificationType.MESSAGE
    });
  }

  static async lineageInvite(recipientId: string, senderId: string, lineageId: string) {
    return this.create({
      recipientId,
      senderId,
      lineageId,
      type: NotificationType.LINEAGE_INVITE
    });
  }

  static async lineageAccept(recipientId: string, senderId: string, lineageId: string) {
    return this.create({
      recipientId,
      senderId,
      lineageId,
      type: NotificationType.LINEAGE_ACCEPT
    });
  }
}
