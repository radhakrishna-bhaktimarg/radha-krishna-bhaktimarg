const DailyLeaderboard = require("../models/DailyLeaderboard");

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

const getAppDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const getAppDateOffsetString = (daysOffset = 0) => {
  const todayParts = getAppDateString().split("-").map(Number);
  const date = new Date(
    Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2] + daysOffset, 12),
  );
  return getAppDateString(date);
};

const sortRankings = (rankings) =>
  rankings
    .sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) {
        return b.combinedScore - a.combinedScore;
      }
      if (a.quizTimeTaken !== b.quizTimeTaken) {
        return a.quizTimeTaken - b.quizTimeTaken;
      }
      return b.completedMalas - a.completedMalas;
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));

const recordDailyLeaderboardEntry = async ({
  devoteeId,
  name,
  date = getAppDateString(),
  quizScore,
  quizTimeTaken,
  completedMalas,
}) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let snapshot = await DailyLeaderboard.findOne({ date });

    if (!snapshot) {
      try {
        snapshot = await DailyLeaderboard.create({
          date,
          rankings: [],
          isFinalized: false,
        });
      } catch (error) {
        if (error?.code === 11000) continue;
        throw error;
      }
    }

    if (snapshot.isFinalized) return;

    const rankings = snapshot.rankings.map((ranking) => ranking.toObject());
    const existingIndex = rankings.findIndex(
      (ranking) => ranking.devoteeId.toString() === devoteeId.toString(),
    );
    const existing = existingIndex >= 0 ? rankings[existingIndex] : {};
    const entry = {
      devoteeId,
      name,
      quizScore:
        quizScore !== undefined ? quizScore : existing.quizScore || 0,
      quizTimeTaken:
        quizTimeTaken !== undefined
          ? quizTimeTaken
          : existing.quizTimeTaken || 999999,
      completedMalas:
        completedMalas !== undefined
          ? Math.max(existing.completedMalas || 0, completedMalas)
          : existing.completedMalas || 0,
    };
    entry.japPoints = entry.completedMalas * 5;
    entry.combinedScore = entry.quizScore + entry.japPoints;

    if (existingIndex >= 0) rankings[existingIndex] = entry;
    else rankings.push(entry);

    const result = await DailyLeaderboard.updateOne(
      { _id: snapshot._id, __v: snapshot.__v || 0, isFinalized: false },
      {
        $set: { rankings: sortRankings(rankings) },
        $inc: { __v: 1 },
      },
    );
    if (result.modifiedCount === 1) return;
  }

  throw new Error(
    `Could not record leaderboard activity for ${devoteeId} after concurrent updates.`,
  );
};

module.exports = {
  getAppDateString,
  getAppDateOffsetString,
  recordDailyLeaderboardEntry,
};
