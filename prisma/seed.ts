
// prisma/seed.ts
import "dotenv/config";
import { faker } from "@faker-js/faker";
import {
  Available,
  FriendRequestStatus,
  KinshipType,
  LineageRole,
  LineageType,
  ListingStatus,
  MediaType,
  NotificationType,
  PostVisibility,
  ProductCondition,
  ReactionType
} from "@prisma/client";
import { prisma } from '../src/config/prisma'; // use your existing client


const NUM_PROFILES = 20;
const NUM_LINEAGES = 5;
const NUM_POSTS = 40;
const MAX_IMAGES_PER_POST = 5;
const NUM_CONVERSATIONS = 10;
const NUM_PRODUCTS = 40;

function safeUsername(base: string) {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

async function seedInterests() {
  const interestNames = [
    "Software Engineering",
    "Music",
    "Football",
    "Basketball",
    "Art",
    "Travel",
    "Food",
    "Startups",
    "History",
    "Family Heritage",
    "Photography",
    "Movies",
    "Reading"
  ];

  await prisma.interest.createMany({
    data: interestNames.map(name => ({ name })),
    skipDuplicates: true
  });

  const all = await prisma.interest.findMany();
  console.log(`✅ Interests: ${all.length} total`);
  return all;
}

async function seedProfiles() {
  const profiles: { id: string; username: string; email: string }[] = [];

  for (let i = 0; i < NUM_PROFILES; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const raw = faker.internet.username({ firstName, lastName });
    const username = safeUsername(raw || `${firstName}_${lastName}`) || `user_${i}`;

    // ensure uniqueness for username + email (because your schema enforces @unique)
    const uniqueSuffix = faker.string.alphanumeric(6).toLowerCase();
    const finalUsername = i === 0 ? username : safeUsername(`${username}_${uniqueSuffix}`);

    const email = faker.internet
      .email({ firstName, lastName, provider: "example.com" })
      .toLowerCase()
      .replace(/@/, `+${uniqueSuffix}@`);

    const profile = await prisma.profile.create({
      data: {
        userId: faker.string.uuid(),
        email,
        firstName,
        lastName,
        username: finalUsername,
        gender: faker.helpers.arrayElement(["male", "female", "other"]),
        dateOfBirth: faker.date.birthdate({ min: 1970, max: 2010, mode: "year" }),
        country: faker.location.country(),
        city: faker.location.city(),
        district: faker.location.street(),
        location: faker.location.streetAddress(),
        bio: faker.lorem.sentence(),
        countryCode: faker.location.countryCode(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUsername}`,
        coverUrl: `https://picsum.photos/seed/${finalUsername}/1200/400`,
        lineageMainSurname: lastName,
        lineageRootVillage: faker.location.city(),
        ethnicity: faker.helpers.arrayElement([ "Yoruba",
          "Igbo",
          "Hausa",
          "Fulani",
          "Ijaw",
          "Tiv",
          "Edo",
          "Kanuri",
          "Ibibio",
          "Nupe"]),
        occupation: faker.person.jobTitle(),
        isVerified: faker.datatype.boolean(),
        isProfileComplete: faker.datatype.boolean()
      }
    });

    // ProfileSettings is optional on Profile, but profileId is the PK there,
    // so we create it here for most users.
    if (faker.datatype.boolean()) {
      await prisma.profileSettings.create({
        data: {
          profileId: profile.id,
          isPrivate: faker.datatype.boolean(),
          showLastSeen: faker.datatype.boolean(),
          allowTagging: faker.datatype.boolean(),
          allowMessagesFrom: faker.helpers.arrayElement(["everyone", "friends", "no_one"]),
          discoveryAllowLineage: faker.datatype.boolean()
        }
      });
    }

    profiles.push({ id: profile.id, username: profile.username, email: profile.email });
  }

  console.log(`✅ Profiles: ${profiles.length}`);
  return profiles;
}

async function seedProfileInterests(
  profiles: { id: string }[],
  interests: { id: string }[]
) {
  let links = 0;

  for (const profile of profiles) {
    const sample = faker.helpers.arrayElements(
      interests,
      faker.number.int({ min: 2, max: 5 })
    );

    for (const interest of sample) {
      await prisma.profileInterest.upsert({
        where: {
          userId_interestId: {
            userId: profile.id,
            interestId: interest.id
          }
        },
        update: {},
        create: {
          userId: profile.id,
          interestId: interest.id
        }
      });

      links++;
    }
  }

  console.log(`✅ ProfileInterest links: ${links}`);
}

async function seedLineages(profiles: { id: string }[]) {
  const lineages = [];

  for (let i = 0; i < NUM_LINEAGES; i++) {
    const creator = faker.helpers.arrayElement(profiles);

    const lineage = await prisma.lineage.create({
      data: {
        name: `${faker.word.adjective()} ${faker.person.lastName()} Family`,
        type: faker.helpers.arrayElement([
          LineageType.FAMILY,
          LineageType.CLAN,
          LineageType.SURNAME_LINE,
          LineageType.TRIBE
        ]),
        primarySurname: faker.person.lastName(),
        rootVillage: faker.location.city(),
        rootRegion: faker.location.state(),
        description: faker.lorem.sentence(),
        createdById: creator.id
      }
    });

    lineages.push(lineage);
  }

  console.log(`✅ Lineages: ${lineages.length}`);

  // memberships
  let membershipCount = 0;
  for (const lineage of lineages) {
    const members = faker.helpers.arrayElements(
      profiles,
      faker.number.int({ min: 4, max: 8 })
    );

    for (const [index, profile] of members.entries()) {
      await prisma.lineageMembership.upsert({
        where: {
          lineageId_profileId: {
            lineageId: lineage.id,
            profileId: profile.id
          }
        },
        update: {},
        create: {
          lineageId: lineage.id,
          profileId: profile.id,
          role:
            index === 0
              ? LineageRole.ANCESTOR
              : faker.helpers.arrayElement([
                  LineageRole.DESCENDANT,
                  LineageRole.SPOUSE,
                  LineageRole.EXTENDED
                ]),
          generation: faker.number.int({ min: 1, max: 5 }),
          isPrimaryLineage: faker.datatype.boolean(),
          addedById: lineage.createdById ?? undefined
        }
      });
      membershipCount++;
    }
  }

  console.log(`✅ LineageMemberships: ${membershipCount}`);
  return lineages;
}

async function seedFriendRequestsAndFriendships(profiles: { id: string }[]) {
  // Create a bunch of friend requests, some accepted, some pending, etc.
  const target = faker.number.int({ min: 12, max: 25 });
  let reqCount = 0;
  let friendshipCount = 0;

  const pairs = new Set<string>();
  const makeKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

  for (let i = 0; i < target; i++) {
    const requester = faker.helpers.arrayElement(profiles);
    const addressee = faker.helpers.arrayElement(
      profiles.filter(p => p.id !== requester.id)
    );

    const key = makeKey(requester.id, addressee.id);
    if (pairs.has(key)) continue;
    pairs.add(key);

    const status = faker.helpers.arrayElement([
      FriendRequestStatus.PENDING,
      FriendRequestStatus.ACCEPTED,
      FriendRequestStatus.DECLINED,
      FriendRequestStatus.CANCELLED
    ]);

    const fr = await prisma.friendRequest.create({
      data: {
        requesterId: requester.id,
        addresseeId: addressee.id,
        status,
        respondedAt:
          status === FriendRequestStatus.PENDING ? null : faker.date.recent({ days: 15 })
      }
    });

    reqCount++;

    // If accepted, create friendship row too (and normalize ordering to satisfy @@unique)
    if (status === FriendRequestStatus.ACCEPTED) {
      const [userAId, userBId] =
        requester.id < addressee.id
          ? [requester.id, addressee.id]
          : [addressee.id, requester.id];

      await prisma.friendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        update: {},
        create: { userAId, userBId }
      });

      friendshipCount++;

      // Optional: create a FRIEND_REQUEST notification for the addressee
      if (faker.datatype.boolean()) {
        await prisma.notification.create({
          data: {
            recipientId: addressee.id,
            senderId: requester.id,
            type: NotificationType.FRIEND_REQUEST,
            requestId: fr.id,
            isRead: faker.datatype.boolean()
          }
        });
      }
    } else {
      // Pending requests can also get notifications
      if (status === FriendRequestStatus.PENDING && faker.datatype.boolean()) {
        await prisma.notification.create({
          data: {
            recipientId: addressee.id,
            senderId: requester.id,
            type: NotificationType.FRIEND_REQUEST,
            requestId: fr.id,
            isRead: faker.datatype.boolean()
          }
        });
      }
    }
  }

  console.log(`✅ FriendRequests: ${reqCount}`);
  console.log(`✅ Friendships: ${friendshipCount}`);
}

async function seedPosts(profiles: { id: string }[], lineages: { id: string }[]) {
  const posts = [];

  for (let i = 0; i < NUM_POSTS; i++) {
    const author = faker.helpers.arrayElement(profiles);

    const lineage =
      faker.datatype.boolean() && lineages.length > 0
        ? faker.helpers.arrayElement(lineages)
        : null;

    const visibility = faker.helpers.arrayElement([
      PostVisibility.PUBLIC,
      PostVisibility.FOLLOWERS,
      PostVisibility.LINEAGE_ONLY,
      PostVisibility.PRIVATE
    ]);

    const post = await prisma.post.create({
      data: {
        profileId: author.id,
        content: faker.lorem.sentences({ min: 1, max: 3 }),
        visibility,
        locationText: faker.location.city(),
        lineageId: lineage?.id ?? null
      }
    });

    posts.push(post);

    // images
    const numImages = faker.number.int({ min: 0, max: MAX_IMAGES_PER_POST });
    for (let j = 0; j < numImages; j++) {
      const seed = `${post.id}-${j}`;
      await prisma.mediaFile.create({
        data: {
          postId: post.id,
          type: MediaType.IMAGE,
          url: `https://picsum.photos/seed/${seed}/800/800`,
          mimeType: "image/jpeg",
          sizeBytes: faker.number.int({ min: 50_000, max: 400_000 }),
          width: 800,
          height: 800
        }
      });
    }
  }

  console.log(`✅ Posts: ${posts.length}`);
  return posts;
}

async function seedComments(posts: { id: string }[], profiles: { id: string }[]) {
  let count = 0;

  for (const post of posts) {
    const numComments = faker.number.int({ min: 0, max: 6 });

    for (let i = 0; i < numComments; i++) {
      const author = faker.helpers.arrayElement(profiles);

      const comment = await prisma.comment.create({
        data: {
          postId: post.id,
          profileId: author.id,
          content: faker.lorem.sentence()
        }
      });

      count++;

      // sometimes create a reply
      if (faker.datatype.boolean()) {
        const replier = faker.helpers.arrayElement(profiles);
        await prisma.comment.create({
          data: {
            postId: post.id,
            profileId: replier.id,
            parentCommentId: comment.id,
            content: faker.lorem.sentence()
          }
        });
        count++;
      }
    }
  }

  console.log(`✅ Comments: ${count}`);
}

async function seedReactions(posts: { id: string }[], profiles: { id: string }[]) {
  let postReactions = 0;
  let commentReactions = 0;

  // Post reactions
  for (const post of posts) {
    const reactors = faker.helpers.arrayElements(
      profiles,
      faker.number.int({ min: 0, max: Math.min(8, profiles.length) })
    );

    for (const p of reactors) {
      await prisma.postReaction.upsert({
        where: {
          postId_profileId: {
            postId: post.id,
            profileId: p.id
          }
        },
        update: {
          type: faker.helpers.arrayElement(Object.values(ReactionType))
        },
        create: {
          postId: post.id,
          profileId: p.id,
          type: faker.helpers.arrayElement(Object.values(ReactionType))
        }
      });
      postReactions++;
    }
  }

  // Comment reactions
  const comments = await prisma.comment.findMany({ select: { id: true } });
  for (const c of comments) {
    const reactors = faker.helpers.arrayElements(
      profiles,
      faker.number.int({ min: 0, max: Math.min(5, profiles.length) })
    );

    for (const p of reactors) {
      await prisma.commentReaction.upsert({
        where: {
          commentId_profileId: { commentId: c.id, profileId: p.id }
        },
        update: {
          type: faker.helpers.arrayElement(Object.values(ReactionType))
        },
        create: {
          commentId: c.id,
          profileId: p.id,
          type: faker.helpers.arrayElement(Object.values(ReactionType))
        }
      });
      commentReactions++;
    }
  }

  console.log(`✅ PostReactions: ${postReactions}`);
  console.log(`✅ CommentReactions: ${commentReactions}`);
}

async function seedConversationsMessagesAndReads(profiles: { id: string }[]) {
  const conversations = [];
  let reads = 0;

  for (let i = 0; i < NUM_CONVERSATIONS; i++) {
    const isGroup = faker.datatype.boolean();
    const creator = faker.helpers.arrayElement(profiles);

    const convo = await prisma.conversation.create({
      data: {
        isGroup,
        title: isGroup ? `${faker.word.adjective()} chat` : null,
        createdById: creator.id
      }
    });

    conversations.push(convo);

    // participants (ensure creator is included)
    const sample = faker.helpers.arrayElements(
      profiles.filter(p => p.id !== creator.id),
      faker.number.int({ min: 1, max: 4 })
    );
    const participants = [creator, ...sample];

    for (const p of participants) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId: convo.id,
          profileId: p.id,
          role: p.id === creator.id ? "owner" : "member",
          lastReadAt: faker.datatype.boolean() ? faker.date.recent({ days: 10 }) : null
        }
      });
    }

    // messages + reads
    const numMessages = faker.number.int({ min: 3, max: 15 });
    const createdMessages: { id: string; senderId: string }[] = [];

    for (let m = 0; m < numMessages; m++) {
      const sender = faker.helpers.arrayElement(participants);
      const msg = await prisma.message.create({
        data: {
          conversationId: convo.id,
          senderId: sender.id,
          content: faker.lorem.sentence(),
          mediaUrl: faker.datatype.boolean()
            ? `https://picsum.photos/seed/msg-${convo.id}-${m}/900/900`
            : null
        }
      });
      createdMessages.push({ id: msg.id, senderId: msg.senderId });
    }

    // reads: for each message, some non-senders read it
    for (const msg of createdMessages) {
      const readers = participants.filter(p => p.id !== msg.senderId);
      for (const r of readers) {
        if (!faker.datatype.boolean()) continue;

        await prisma.messageRead.upsert({
          where: { messageId_userId: { messageId: msg.id, userId: r.id } },
          update: {},
          create: { messageId: msg.id, userId: r.id, readAt: faker.date.recent({ days: 7 }) }
        });
        reads++;
      }
    }
  }

  console.log(`✅ Conversations: ${conversations.length}`);
  console.log(`✅ MessageReads: ${reads}`);
  return conversations;
}

async function seedKinships(profiles: { id: string }[]) {
  const relations = [
    KinshipType.PARENT,
    KinshipType.CHILD,
    KinshipType.SIBLING,
    KinshipType.COUSIN,
    KinshipType.UNCLE_AUNT,
    KinshipType.NEPHEW_NIECE,
    KinshipType.GRANDPARENT,
    KinshipType.GRANDCHILD
  ];

  let count = 0;

  for (const profile of profiles) {
    const others = profiles.filter(p => p.id !== profile.id);
    const relatives = faker.helpers.arrayElements(others, faker.number.int({ min: 1, max: 3 }));

    for (const other of relatives) {
      const relationAtoB = faker.helpers.arrayElement(relations);

      await prisma.kinship.upsert({
        where: {
          profileIdA_profileIdB_relationAtoB: {
            profileIdA: profile.id,
            profileIdB: other.id,
            relationAtoB
          }
        },
        update: {},
        create: {
          profileIdA: profile.id,
          profileIdB: other.id,
          relationAtoB,
          verified: faker.datatype.boolean(),
          verifiedById: faker.datatype.boolean()
            ? faker.helpers.arrayElement(profiles).id
            : null
        }
      });

      count++;
    }
  }

  console.log(`✅ Kinships: ${count}`);
}

async function seedBlocksAndMutes(profiles: { id: string }[]) {
  let blocks = 0;
  let mutes = 0;

  // small number so it doesn't break social graphs too much
  const num = faker.number.int({ min: 3, max: 10 });

  const unique = new Set<string>();
  const key = (a: string, b: string) => `${a}:${b}`;

  for (let i = 0; i < num; i++) {
    const blocker = faker.helpers.arrayElement(profiles);
    const blocked = faker.helpers.arrayElement(profiles.filter(p => p.id !== blocker.id));
    const k = key(blocker.id, blocked.id);
    if (unique.has(k)) continue;
    unique.add(k);

    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: blocker.id, blockedId: blocked.id } },
      update: {},
      create: { blockerId: blocker.id, blockedId: blocked.id }
    });
    blocks++;
  }

  for (let i = 0; i < num; i++) {
    const muter = faker.helpers.arrayElement(profiles);
    const muted = faker.helpers.arrayElement(profiles.filter(p => p.id !== muter.id));
    const k = key(muter.id, muted.id);
    if (unique.has(`m:${k}`)) continue;
    unique.add(`m:${k}`);

    await prisma.mute.upsert({
      where: { muterId_mutedId: { muterId: muter.id, mutedId: muted.id } },
      update: {},
      create: { muterId: muter.id, mutedId: muted.id }
    });
    mutes++;
  }

  console.log(`✅ Blocks: ${blocks}`);
  console.log(`✅ Mutes: ${mutes}`);
}

async function seedProducts(profiles: { id: string }[]) {
  let products = 0;

  for (let i = 0; i < NUM_PRODUCTS; i++) {
    const seller = faker.helpers.arrayElement(profiles);
    const status = faker.helpers.arrayElement(Object.values(ListingStatus));
    const isPublished = status === ListingStatus.ACTIVE || status === ListingStatus.SOLD;

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        visibility: faker.helpers.arrayElement(Object.values(PostVisibility)),
        title: faker.commerce.productName(),
        price: faker.number.int({ min: 10, max: 2000 }),
        currency: faker.helpers.arrayElement(["NGN", "GBP", "USD"]),
        description: faker.commerce.productDescription(),
        category: faker.commerce.department(),
        condition: faker.helpers.arrayElement(Object.values(ProductCondition)),
        negotiable: faker.datatype.boolean(),
        availability: faker.helpers.arrayElement(Object.values(Available)),
        status,
        publishedAt: isPublished ? faker.date.recent({ days: 30 }) : null,
        expiresAt: isPublished ? faker.date.soon({ days: 60 }) : null,
        deletedAt: status === ListingStatus.DELETED ? faker.date.recent({ days: 10 }) : null,
        country: faker.location.country(),
        city: faker.location.city(),
        district: faker.location.street(),
        locationText: faker.location.city(),
        lat: faker.datatype.boolean() ? faker.location.latitude() : null,
        lng: faker.datatype.boolean() ? faker.location.longitude() : null,
        viewCount: faker.number.int({ min: 0, max: 500 }),
        saveCount: faker.number.int({ min: 0, max: 60 })
      }
    });

    products++;

    // media
    const numMedia = faker.number.int({ min: 0, max: 4 });
    for (let m = 0; m < numMedia; m++) {
      const seed = `prod-${product.id}-${m}`;
      await prisma.productMedia.create({
        data: {
          productId: product.id,
          url: `https://picsum.photos/seed/${seed}/900/900`,
          mimeType: "image/jpeg",
          width: 900,
          height: 900,
          sizeBytes: faker.number.int({ min: 70_000, max: 700_000 }),
          orderIndex: m,
          isCover: m === 0
        }
      });
    }
  }

  console.log(`✅ Products: ${products}`);
}

async function seedNotifications() {
  let count = 0;

  // COMMENT notifications (to post owner)
  const comments = await prisma.comment.findMany({
    include: { post: true }
  });

  for (const comment of comments) {
    if (!faker.datatype.boolean()) continue;

    await prisma.notification.create({
      data: {
        recipientId: comment.post.profileId,
        senderId: comment.profileId,
        type: NotificationType.COMMENT,
        postId: comment.postId,
        commentId: comment.id,
        isRead: faker.datatype.boolean()
      }
    });

    count++;
  }

  // LIKE notifications (post likes)
  const likes = await prisma.postReaction.findMany({
    include: { post: true }
  });

  for (const like of likes) {
    if (!faker.datatype.boolean()) continue;

    // don't notify self
    if (like.profileId === like.post.profileId) continue;

    await prisma.notification.create({
      data: {
        recipientId: like.post.profileId,
        senderId: like.profileId,
        type: NotificationType.LIKE,
        postId: like.postId,
        isRead: faker.datatype.boolean()
      }
    });

    count++;
  }

  // MESSAGE notifications (to other participants in the conversation)
  const messages = await prisma.message.findMany({
    include: {
      conversation: {
        include: { participants: true }
      }
    }
  });

  for (const msg of messages) {
    const participants = msg.conversation.participants.filter(
      p => p.profileId !== msg.senderId
    );

    for (const p of participants) {
      if (!faker.datatype.boolean()) continue;

      await prisma.notification.create({
        data: {
          recipientId: p.profileId,
          senderId: msg.senderId,
          type: NotificationType.MESSAGE,
          messageId: msg.id,
          isRead: faker.datatype.boolean()
        }
      });

      count++;
    }
  }

  // LINEAGE_INVITE notifications (for some memberships)
  const memberships = await prisma.lineageMembership.findMany();
  for (const mem of memberships) {
    if (!faker.datatype.boolean()) continue;

    await prisma.notification.create({
      data: {
        recipientId: mem.profileId,
        senderId: mem.addedById ?? null,
        type: NotificationType.LINEAGE_INVITE,
        lineageId: mem.lineageId,
        isRead: faker.datatype.boolean()
      }
    });

    count++;
  }

  console.log(`✅ Notifications: ${count}`);
}

async function main() {
  console.log("🌱 Seeding Linuty data (new schema)...");

  // Clear existing data (order matters due to FKs)
  await prisma.notification.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();

  await prisma.commentReaction.deleteMany();
  await prisma.postReaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.mediaFile.deleteMany();
  await prisma.post.deleteMany();

  await prisma.productMedia.deleteMany();
  await prisma.product.deleteMany();

  await prisma.block.deleteMany();
  await prisma.mute.deleteMany();

  await prisma.friendship.deleteMany();
  await prisma.friendRequest.deleteMany();

  await prisma.kinship.deleteMany();
  await prisma.lineageMembership.deleteMany();
  await prisma.lineage.deleteMany();

  await prisma.profileInterest.deleteMany();
  await prisma.interest.deleteMany();

  await prisma.profileSettings.deleteMany();
  await prisma.profile.deleteMany();

  const interests = await seedInterests();
  const profiles = await seedProfiles();
  await seedProfileInterests(profiles, interests);

  const lineages = await seedLineages(profiles);

  await seedFriendRequestsAndFriendships(profiles);
  await seedKinships(profiles);
  await seedBlocksAndMutes(profiles);

  const posts = await seedPosts(profiles, lineages);
  await seedComments(posts, profiles);
  await seedReactions(posts, profiles);

  await seedProducts(profiles);

  await seedConversationsMessagesAndReads(profiles);
  await seedNotifications();

  console.log("✅ Done seeding!");
}

main()
  .catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

