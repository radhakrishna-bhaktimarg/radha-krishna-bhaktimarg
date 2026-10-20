const cron = require("node-cron");
const Devotee = require("../models/Devotee");
const DailyLeaderboard = require("../models/DailyLeaderboard");
const {
  getAppDateOffsetString,
} = require("../utils/dailyLeaderboardHelper");
const { withLeaderboardLock } = require("../utils/leaderboardLock");

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

// Helper: App-local date formatter YYYY-MM-DD
const getDateString = (daysOffset = 0) => {
  return getAppDateOffsetString(daysOffset);
};

// Snapshot generator & day reset logic
const runDailyMidnightRollover = async (assertLock) => {
  try {
    const yesterday = getDateString(-1);
    const today = getDateString(0);
    assertLock?.();

    console.log(
      `⏰ [CRON] Starting Daily Midnight Leaderboard Rollover for ${yesterday}...`,
    );

    // 1. Finalize activity already recorded during the day.
    const existingSnapshot = await DailyLeaderboard.findOne({
      date: yesterday,
    }).lean();

    if (existingSnapshot) {
      assertLock?.();
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
    assertLock?.();

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

    const mergedRankings = [...(existingSnapshot?.rankings || [])];
    legacyRankings.forEach((legacyEntry) => {
      const index = mergedRankings.findIndex(
        (entry) =>
          entry.devoteeId.toString() === legacyEntry.devoteeId.toString(),
      );
      if (index === -1) {
        mergedRankings.push(legacyEntry);
        return;
      }

      const existingEntry = mergedRankings[index];
      mergedRankings[index] = {
        ...existingEntry,
        quizScore: legacyEntry.quizScore || existingEntry.quizScore || 0,
        quizTimeTaken:
          legacyEntry.quizTimeTaken < 999999
            ? legacyEntry.quizTimeTaken
            : existingEntry.quizTimeTaken || 999999,
        completedMalas: Math.max(
          existingEntry.completedMalas || 0,
          legacyEntry.completedMalas || 0,
        ),
      };
      mergedRankings[index].japPoints =
        mergedRankings[index].completedMalas * 5;
      mergedRankings[index].combinedScore =
        mergedRankings[index].quizScore + mergedRankings[index].japPoints;
    });

    mergedRankings.sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) {
        return b.combinedScore - a.combinedScore;
      }
      if (a.quizTimeTaken !== b.quizTimeTaken) {
        return a.quizTimeTaken - b.quizTimeTaken;
      }
      return b.completedMalas - a.completedMalas;
    });
    mergedRankings.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    await DailyLeaderboard.findOneAndUpdate(
      { date: yesterday },
      { date: yesterday, rankings: mergedRankings, isFinalized: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    assertLock?.();

    console.log(
      `✅ [CRON] DailyLeaderboard snapshot archived for ${yesterday} (${existingSnapshot?.rankings?.length || legacyRankings.length} devotees).`,
    );

    // 3. Reset daily metrics on all devotees for the new day
    assertLock?.();
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
    assertLock?.();

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

const executeDailyMidnightRollover = () =>
  withLeaderboardLock(runDailyMidnightRollover);

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
