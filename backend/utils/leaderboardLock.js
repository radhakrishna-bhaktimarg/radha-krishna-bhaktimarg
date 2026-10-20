const crypto = require("crypto");
const LeaderboardLock = require("../models/LeaderboardLock");

const LOCK_KEY = "daily-leaderboard";
const LOCK_TTL_MS = 300000;
const LOCK_WAIT_MS = 15000;

const wait = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const acquireLeaderboardLock = async () => {
  const token = crypto.randomUUID();
  const deadline = Date.now() + LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    try {
      const lock = await LeaderboardLock.findOneAndUpdate(
        {
          key: LOCK_KEY,
          $or: [
            { lockedUntil: { $lte: new Date() } },
            { lockedUntil: { $exists: false } },
          ],
        },
        {
          $set: {
            token,
            lockedUntil: new Date(Date.now() + LOCK_TTL_MS),
          },
        },
        { upsert: true, new: true },
      ).lean();

      if (lock?.token === token) return token;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    await wait(100);
  }

  const error = new Error("Leaderboard is busy; please retry this operation.");
  error.code = "LEADERBOARD_LOCK_TIMEOUT";
  throw error;
};

const releaseLeaderboardLock = async (token) => {
  await LeaderboardLock.deleteOne({ key: LOCK_KEY, token });
};

const withLeaderboardLock = async (callback) => {
  const token = await acquireLeaderboardLock();
  try {
    return await callback();
  } finally {
    await releaseLeaderboardLock(token);
  }
};

module.exports = { withLeaderboardLock };
