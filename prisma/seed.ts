// prisma/seed.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";

const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_KEY as string);

async function seedUsers() {
   const usersToInsert = Array.from({ length: 20 }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
   }));

   const { data, error } = await supabase
      .from("User") // or "users" depending on your table name
      .insert(usersToInsert)
      .select("id"); // we need the ids back

   if (error) throw error;
   if (!data || data.length === 0) {
      throw new Error("Failed to insert users.");
   }

   return data; // [{ id: 1 }, { id: 2 }, ...]
}

async function seedPosts() {
   const users = await seedUsers();

   const posts = Array.from({ length: 20 }).map(() => {
      const author = faker.helpers.arrayElement(users);

      return {
         // id & created_at omitted → let DB defaults handle them
         title: faker.lorem.sentence(),
         content: faker.lorem.paragraph(),
         published: faker.datatype.boolean(), // Boolean in your model
         authorId: author.id, // must match `authorId Int`
      };
   });

   const { error } = await supabase.from("Post").insert(posts); // or "posts"
   if (error) throw error;
}

async function main() {
   await seedPosts();
   console.log("✅ Seeded users + 20 posts");
}

main().catch((err) => {
   console.error(err);
   process.exit(1);
});
