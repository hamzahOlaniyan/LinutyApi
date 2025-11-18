const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

// Login
router.post("/login", async (req, res) => {
   const { email, password } = req.body;

   const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
   });

   if (error) return res.status(401).json({ error });
   res.json(data);
});

// Sign up
router.post("/signup", async (req, res) => {
   const { email, password, ...profile } = req.body;

   const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
         data: profile,
      },
   });

   if (error) return res.status(400).json({ error });
   res.json(data);
});

module.exports = router;
