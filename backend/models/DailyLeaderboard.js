const mongoose = require("mongoose");

const devoteeRankSchema = new mongoose.Schema({
  devoteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Devotee",
    required: true,
  },
  name: { type: String, required: true },
  quizScore: { type: Number, default: 0 },
  quizTimeTaken: { type: Number, default: 999999 }, // Duration in seconds
  completedMalas: { type: Number, default: 0 },
  japActivityVersion: { type: Number, default: 0 },
  japPoints: { type: Number, default: 0 }, // malas * 5
  combinedScore: { type: Number, default: 0 }, // quizScore + japPoints
  rank: { type: Number, required: true },
});

const dailyLeaderboardSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true, // "YYYY-MM-DD"
      index: true,
    },
    rankings: [devoteeRankSchema],
    isFinalized: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DailyLeaderboard", dailyLeaderboardSchema);
