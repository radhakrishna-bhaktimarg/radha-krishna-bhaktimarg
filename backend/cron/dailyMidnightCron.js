const cron = require("node-cron");
const Devotee = require("../models/Devotee");
const DailyLeaderboard = require("../models/DailyLeaderboard");
const {
  getAppDateOffsetString,
} = require("../utils/dailyLeaderboardHelper");

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

// Helper: App-local date formatter YYYY-MM-DD
const getDateString = (daysOffset = 0) => {
  return getAppDateOffsetString(daysOffset);
};

// Snapshot generator & day reset logic
const executeDailyMidnightRollover = async () => {
  try {
    const yesterday = getDateString(-1);
    const today = getDateString(0);

    console.log(
      `⏰ [CRON] Starting Daily Midnight Leaderboard Rollover for ${yesterday}...`,
    );

    // 1. Finalize activity already recorded during the day.
    const existingSnapshot = await DailyLeaderboard.findOne({
      date: yesterday,
    }).lean();

    if (existingSnapshot) {
      await DailyLeaderboard.updateOne(
        { date: yesterday },
        { $set: { isFinalized: true } },
      );
    }

    // Legacy fallback for activity recorded before daily snapshots were added.
    const devotees = await Devotee.find({ role: "devotee" })
      .select(
        "name lastQuizDate dailyQuizAttempts dailyQuizScore dailyQuizTimeTaken lastJapDate dailyCompletedMalas",
      )
      .lean();

    const legacyRankings = devotees
      .map((d) => {
        const quizScore =
          d.lastQuizDate === yesterday ? d.dailyQuizScore || 0 : 0;
        const quizTimeTaken =
          d.lastQuizDate === yesterday
            ? d.dailyQuizTimeTaken || 999999
            : 999999;
        const malas =
          d.lastJapDate === yesterday ? d.dailyCompletedMalas || 0 : 0;
        const japPoints = malas * 5;
        const combinedScore = quizScore + japPoints;

        return {
          devoteeId: d._id,
          name: d.name,
          quizScore,
          quizTimeTaken,
          completedMalas: malas,
          japPoints,
          combinedScore,
          participated:
            (d.lastQuizDate === yesterday &&
              (d.dailyQuizAttempts || 0) >= 1) ||
            (d.lastJapDate === yesterday && (d.dailyCompletedMalas || 0) > 0),
        };
      })
      .filter((item) => item.participated)
      .sort((a, b) => {
        if (b.combinedScore !== a.combinedScore)
          return b.combinedScore - a.combinedScore;
        if (a.quizTimeTaken !== b.quizTimeTaken)
          return a.quizTimeTaken - b.quizTimeTaken;
        return b.completedMalas - a.completedMalas;
      })
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    if (!existingSnapshot) {
      await DailyLeaderboard.findOneAndUpdate(
        { date: yesterday },
        { date: yesterday, rankings: legacyRankings, isFinalized: true },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    console.log(
      `✅ [CRON] DailyLeaderboard snapshot archived for ${yesterday} (${existingSnapshot?.rankings?.length || legacyRankings.length} devotees).`,
    );

    // 3. Reset daily metrics on all devotees for the new day
    const resetResult = await Devotee.updateMany(
      { role: "devotee" },
      [
        {
          $set: {
            dailyQuizScore: {
              $cond: [
                { $eq: ["$lastQuizDate", today] },
                { $ifNull: ["$dailyQuizScore", 0] },
                0,
              ],
            },
            dailyQuizCorrectCount: {
              $cond: [
                { $eq: ["$lastQuizDate", today] },
                { $ifNull: ["$dailyQuizCorrectCount", 0] },
                0,
              ],
            },
            dailyQuizAttempts: {
              $cond: [
                { $eq: ["$lastQuizDate", today] },
                { $ifNull: ["$dailyQuizAttempts", 0] },
                0,
              ],
            },
            dailyQuizTimeTaken: {
              $cond: [
                { $eq: ["$lastQuizDate", today] },
                { $ifNull: ["$dailyQuizTimeTaken", 999999] },
                999999,
              ],
            },
            dailyCompletedMalas: {
              $cond: [
                { $eq: ["$lastJapDate", today] },
                { $ifNull: ["$dailyCompletedMalas", 0] },
                0,
              ],
            },
            lastJapDate: today,
          },
        },
        {
          $set: {
            japScore: { $multiply: [{ $ifNull: ["$dailyCompletedMalas", 0] }, 5] },
            totalScore: {
              $add: [
                { $ifNull: ["$dailyQuizScore", 0] },
                { $multiply: [{ $ifNull: ["$dailyCompletedMalas", 0] }, 5] },
              ],
            },
          },
        },
      ],
    );

    console.log(
      `🌅 [CRON] New day (${today}) started. Reset ${resetResult.modifiedCount} devotee daily scores.`,
    );
    return {
      success: true,
      yesterday,
      archivedDevotees: existingSnapshot?.rankings?.length || legacyRankings.length,
    };
  } catch (error) {
    console.error("❌ [CRON] Midnight Rollover Error:", error);
    throw error;
  }
};

// Initializes the cron job to run at 00:00 every day
const startMidnightCron = () => {
  cron.schedule("0 0 * * *", () => {
    executeDailyMidnightRollover();
  }, { timezone: APP_TIME_ZONE });
  console.log(
    "⏳ [CRON] Midnight Rollover scheduler initialized (runs daily at 00:00).",
  );
};

module.exports = {
  startMidnightCron,
  executeDailyMidnightRollover,
};
