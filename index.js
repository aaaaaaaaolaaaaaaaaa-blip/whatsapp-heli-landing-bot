import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Helicopter Landing Bot Running");
});

app.post("/webhook", async (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
