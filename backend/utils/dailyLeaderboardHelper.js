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
  const snapshot = await DailyLeaderboard.findOne({ date }).lean();
  const rankings = [...(snapshot?.rankings || [])];
  const existingIndex = rankings.findIndex(
    (ranking) => ranking.devoteeId.toString() === devoteeId.toString(),
  );
  const existing = existingIndex >= 0 ? rankings[existingIndex] : {};
  const quizHasBeenPlayed = quizScore !== undefined;
  const malasHaveBeenCompleted = completedMalas !== undefined;
  const entry = {
    devoteeId,
    name,
    quizScore: quizHasBeenPlayed
      ? quizScore
      : existing.quizScore || 0,
    quizTimeTaken: quizHasBeenPlayed
      ? quizTimeTaken
      : existing.quizTimeTaken || 999999,
    completedMalas: malasHaveBeenCompleted
      ? completedMalas
      : existing.completedMalas || 0,
  };
  entry.japPoints = entry.completedMalas * 5;
  entry.combinedScore = entry.quizScore + entry.japPoints;

  if (existingIndex >= 0) {
    rankings[existingIndex] = entry;
  } else {
    rankings.push(entry);
  }

  await DailyLeaderboard.findOneAndUpdate(
    { date },
    {
      date,
      rankings: sortRankings(rankings),
      isFinalized: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

module.exports = {
  getAppDateString,
  recordDailyLeaderboardEntry,
};
