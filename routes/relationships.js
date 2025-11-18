router.post("/request", async (req, res) => {
   const { requester, receiver } = req.body;

   const { data, error } = await supabase
      .from("relationships")
      .insert({
         requester,
         receiver,
         status: "pending",
      })
      .select();

   res.json({ data, error });
});

router.post("/accept", async (req, res) => {
   const { id } = req.body;

   const { data, error } = await supabase.from("relationships").update({ status: "accepted" }).eq("id", id).select();

   res.json({ data, error });
});
