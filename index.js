const express = require("express");
const app = express();
app.use(express.json());

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/profiles", require("./routes/profiles"));
app.use("/posts", require("./routes/posts"));
app.use("/likes", require("./routes/likes"));
app.use("/saved", require("./routes/saved"));
app.use("/relationships", require("./routes/relationships"));
app.use("/store", require("./routes/store"));

app.get("/", (req, res) => {
   res.send("Linuty API is running 🥳");
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
   console.log("Server running on port", port);
});
