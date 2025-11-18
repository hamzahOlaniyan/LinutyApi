const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

// Get all posts
router.get("/", async (req, res) => {
   const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false });

   res.json({ data, error });
});

// Create a post
router.post("/", async (req, res) => {
   const { data, error } = await supabase.from("posts").insert(req.body).select();

   res.json({ data, error });
});

module.exports = router;
