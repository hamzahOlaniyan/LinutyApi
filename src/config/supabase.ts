import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL env not set");
}
if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY env not set");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// module.exports = supabase;
async function checkConnection() {
   const { data, error } = await supabaseAdmin
      .from("profile") // any existing table
      .select("id")
      .limit(1);

   if (error) {
      console.error("❌ Supabase connection failed:", error.message);
   } else {
      console.log("✅ Supabase connected. Sample data:", data);
   }
}

checkConnection();