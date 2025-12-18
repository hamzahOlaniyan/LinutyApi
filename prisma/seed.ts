// // prisma/seed.ts
// import "dotenv/config";
// import { createClient } from "@supabase/supabase-js";
// import { faker } from "@faker-js/faker";

// const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_KEY as string);

// async function seedUsers() {
//    const usersToInsert = Array.from({ length: 20 }).map(() => ({
//       name: faker.person.fullName(),
//       email: faker.internet.email().toLowerCase(),
//    }));

//    const { data, error } = await supabase
//       .from("User") // or "users" depending on your table name
//       .insert(usersToInsert)
//       .select("id"); // we need the ids back

//    if (error) throw error;
//    if (!data || data.length === 0) {
//       throw new Error("Failed to insert users.");
//    }

//    return data; // [{ id: 1 }, { id: 2 }, ...]
// }

// async function seedPosts() {
//    const users = await seedUsers();

//    const posts = Array.from({ length: 20 }).map(() => {
//       const author = faker.helpers.arrayElement(users);

//       return {
//          // id & created_at omitted → let DB defaults handle them
//          title: faker.lorem.sentence(),
//          content: faker.lorem.paragraph(),
//          published: faker.datatype.boolean(), // Boolean in your model
//          authorId: author.id, // must match `authorId Int`
//       };
//    });

//    const { error } = await supabase.from("Post").insert(posts); // or "posts"
//    if (error) throw error;
// }

// async function main() {
//    await seedPosts();
//    console.log("✅ Seeded users + 20 posts");
// }

// main().catch((err) => {
//    console.error(err);
//    process.exit(1);
// });

// prisma/seed.ts
import "dotenv/config";
import { faker } from "@faker-js/faker";
import {
  MediaType,
  LineageType,
  LineageRole,
  KinshipType,
  PostVisibility
} from "@prisma/client";
import { prisma } from '../src/config/prisma'; // use your existing client
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_KEY as string);



// const prisma = new PrismaClient();

const NUM_PROFILES = 15;
const NUM_LINEAGES = 3;
const NUM_POSTS = 40;
const MAX_IMAGES_PER_POST = 3;
const NUM_CONVERSATIONS = 5;

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

  const interests = await prisma.interest.createMany({
    data: interestNames.map(name => ({ name })),
    skipDuplicates: true
  });

  const allInterests = await prisma.interest.findMany();
  console.log(`✅ Interests: ${allInterests.length} total`);

  return allInterests;
}

async function seedProfiles() {
  const profiles: {
    id: string;
    userId: string;
    username: string;
  }[] = [];

  for (let i = 0; i < NUM_PROFILES; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = faker.internet
      .username({
        firstName,
        lastName
      })
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    const userId = faker.string.uuid(); // NOTE: not linking to Supabase auth here
    const email = faker.internet.email({
      firstName,
      lastName
    }).toLowerCase();

    const profile = await prisma.profile.create({
      data: {
        userId,
        email,
        firstName,
        lastName,
        username,
        gender: faker.helpers.arrayElement(["male", "female", "other"]),
        dateOfBirth: faker.date.birthdate({ min: 1970, max: 2010, mode: "year" }),
        country: faker.location.country(),
        city: faker.location.city(),
        district: faker.location.street(),
        location: faker.location.streetAddress(),
        bio: faker.lorem.sentence(),
        countryCode: faker.location.countryCode(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        coverUrl: `https://picsum.photos/seed/${username}/1200/400`,
        lineageMainSurname: lastName,
        lineageRootVillage: faker.location.city(),
        isVerified: faker.datatype.boolean()
      }
    });

    profiles.push({
      id: profile.id,
      userId: profile.userId,
      username: profile.username
    });
  }

  console.log(`✅ Profiles: ${profiles.length}`);
  return profiles;
}

async function seedProfileInterests(
  profiles: { id: string; username: string }[],
  interests: { id: string; name: string }[]
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

async function seedLineages(profiles: { id: string; username: string }[]) {
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

async function seedFollows(profiles: { id: string }[]) {
  let followCount = 0;

  for (const profile of profiles) {
    const others = profiles.filter(p => p.id !== profile.id);
    const followSample = faker.helpers.arrayElements(
      others,
      faker.number.int({ min: 3, max: 8 })
    );

    for (const other of followSample) {
      await prisma.follow.upsert({
        where: {
          followerId_followeeId: {
            followerId: profile.id,
            followeeId: other.id
          }
        },
        update: {},
        create: {
          followerId: profile.id,
          followeeId: other.id
        }
      });
      followCount++;
    }
  }

  console.log(`✅ Follows: ${followCount}`);
}

async function seedPosts(
  profiles: { id: string; username: string }[],
  lineages: { id: string }[]
) {
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

      await prisma.comment.create({
        data: {
          postId: post.id,
          profileId: author.id,
          content: faker.lorem.sentence()
        }
      });

      count++;
    }
  }

  console.log(`✅ Comments: ${count}`);
}

async function seedConversationsAndMessages(
  profiles: { id: string; username: string }[]
) {
  const conversations = [];

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

    // participants
    const partSample = faker.helpers.arrayElements(
      profiles,
      faker.number.int({ min: 2, max: 5 })
    );

    for (const p of partSample) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId: convo.id,
          profileId: p.id,
          role: p.id === creator.id ? "owner" : "member"
        }
      });
    }

    // messages
    const numMessages = faker.number.int({ min: 3, max: 15 });
    for (let m = 0; m < numMessages; m++) {
      const sender = faker.helpers.arrayElement(partSample);
      await prisma.message.create({
        data: {
          conversationId: convo.id,
          senderId: sender.id,
          content: faker.lorem.sentence()
        }
      });
    }
  }

  console.log(`✅ Conversations: ${conversations.length}`);
}

async function seedKinships(profiles: { id: string; username: string }[]) {
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
    const relatives = faker.helpers.arrayElements(
      others,
      faker.number.int({ min: 1, max: 3 })
    );

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
async function seedNotifications() {
  let count = 0;

  // FOLLOW notifications (some of them)
  const follows = await prisma.follow.findMany();
  for (const follow of follows) {
    if (!faker.datatype.boolean()) continue;

    await prisma.notification.create({
      data: {
        recipientId: follow.followeeId,
        actorId: follow.followerId,
        type: "FOLLOW",
        isRead: faker.datatype.boolean()
      }
    });
    count++;
  }

  // COMMENT notifications (to post owner)
  const comments = await prisma.comment.findMany({
    include: { post: true }
  });
  for (const comment of comments) {
    if (!faker.datatype.boolean()) continue;

    await prisma.notification.create({
      data: {
        recipientId: comment.post.profileId,
        actorId: comment.profileId,
        type: "COMMENT",
        postId: comment.postId,
        commentId: comment.id,
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
          actorId: msg.senderId,
          type: "MESSAGE",
          messageId: msg.id,
          isRead: faker.datatype.boolean()
        }
      });
      count++;
    }
  }

  console.log(`✅ Notifications: ${count}`);
}


async function main() {
  console.log("🌱 Seeding Linuty data...");

  // Clear existing data (order matters due to FKs)
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.commentReaction.deleteMany();
  await prisma.postReaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.mediaFile.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
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
  await seedFollows(profiles);
  await seedKinships(profiles);
  const posts = await seedPosts(profiles, lineages);
  await seedComments(posts, profiles);
  await seedConversationsAndMessages(profiles);
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
