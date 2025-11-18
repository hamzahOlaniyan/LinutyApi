const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

router.get("/:id", async (req, res) => {
   const { id } = req.params;

   const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();

   res.json({ data, error });
});

router.put("/:id", async (req, res) => {
   const { id } = req.params;

   const { data, error } = await supabase.from("profiles").update(req.body).eq("id", id).select().single();

   res.json({ data, error });
});

module.exports = router;
