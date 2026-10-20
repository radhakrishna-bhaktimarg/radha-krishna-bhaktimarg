const mongoose = require("mongoose");

const leaderboardLockSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    token: { type: String, required: true },
    lockedUntil: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LeaderboardLock", leaderboardLockSchema);
