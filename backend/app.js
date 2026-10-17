const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/quiz", require("./routes/quizRoutes"));
app.use("/api/jap", require("./routes/japRoutes"));
app.use("/api/leaderboard", require("./routes/leaderboardRoutes"));
app.use("/api/seva", require("./routes/sevaRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/bhajans", require("./routes/bhajanRoutes"));

app.get("/", (req, res) => {
  res.send("Radha Krishna Bhaktimarg API is working!");
});

module.exports = app;
