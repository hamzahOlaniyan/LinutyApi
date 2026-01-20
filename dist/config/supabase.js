"use strict";
// import { createClient, SupabaseClient } from "@supabase/supabase-js";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseAdmin = getSupabaseAdmin;
// let cached: SupabaseClient | null = null;
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// if (!supabaseUrl) {
//   throw new Error("SUPABASE_URL env not set");
// }
// if (!supabaseServiceRoleKey) {
//   throw new Error("SUPABASE_SERVICE_ROLE_KEY env not set");
// }
// export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false,
//     detectSessionInUrl: false,
//   }
// });
const supabase_js_1 = require("@supabase/supabase-js");
let cached = null;
function getSupabaseAdmin() {
    if (cached)
        return cached;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl)
        throw new Error("SUPABASE_URL env not set");
    if (!serviceKey)
        throw new Error("SUPABASE_SERVICE_ROLE_KEY env not set");
    cached = (0, supabase_js_1.createClient)(supabaseUrl, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
    return cached;
}
