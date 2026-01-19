"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl) {
    throw new Error("SUPABASE_URL env not set");
}
if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY env not set");
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    }
});
// module.exports = supabase;
// async function checkConnection() {
//    const { data, error } = await supabaseAdmin
//       .from("profile") // any existing table
//       .select("id")
//       .limit(1);
//    if (error) {
//       console.error("❌ Supabase connection failed:", error.message);
//    } else {
//       console.log("✅ Supabase connected. Sample data:", data);
//    }
// }
// checkConnection();
