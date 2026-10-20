const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Devotee = require("../models/Devotee");
const DailyLeaderboard = require("../models/DailyLeaderboard");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getAppDateString,
  getAppDateOffsetString,
} = require("../utils/dailyLeaderboardHelper");
const { executeDailyMidnightRollover } = require("../cron/dailyMidnightCron");

// Helper: App-local date formatter YYYY-MM-DD
const getDateString = (daysOffset = 0) => {
  return getAppDateOffsetString(daysOffset);
};

const finalizeSnapshot = async (date) => {
  await DailyLeaderboard.updateOne(
    { date, isFinalized: false },
    { $set: { isFinalized: true } },
  );
};

/*
 * Kept for historical snapshots created before activity was recorded directly.
 * New entries are written by the quiz and jap routes as they happen.
 */
const generateAndSaveSnapshot = async (targetDate, isFinalized = false) => {
  const recordedLeaderboard = await DailyLeaderboard.findOne({
    date: targetDate,
  }).lean();

  if (recordedLeaderboard?.rankings?.length) {
    return DailyLeaderboard.findOneAndUpdate(
      { date: targetDate },
      { $set: { isFinalized } },
      { new: true },
    );
  }

  const devotees = await Devotee.find({ role: "devotee" })
    .select(
      "name lastQuizDate dailyQuizAttempts dailyQuizScore dailyQuizTimeTaken lastJapDate dailyCompletedMalas",
    )
    .lean();

  const formatted = devotees
    .map((d) => {
      const participated =
        (d.lastQuizDate === targetDate && (d.dailyQuizAttempts || 0) >= 1) ||
        (d.lastJapDate === targetDate && (d.dailyCompletedMalas || 0) > 0);
      const quizScore =
        d.lastQuizDate === targetDate ? d.dailyQuizScore || 0 : 0;
      const quizTimeTaken =
        d.lastQuizDate === targetDate ? d.dailyQuizTimeTaken || 999999 : 999999;
      const malas =
        d.lastJapDate === targetDate ? d.dailyCompletedMalas || 0 : 0;
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
        participated,
      };
    })
    .filter((item) => item.participated)
    .sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) {
        return b.combinedScore - a.combinedScore;
      }
      if (a.quizTimeTaken !== b.quizTimeTaken) {
        return a.quizTimeTaken - b.quizTimeTaken;
      }
      return b.completedMalas - a.completedMalas;
    })
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const record = await DailyLeaderboard.findOneAndUpdate(
    { date: targetDate },
    { date: targetDate, rankings: formatted, isFinalized },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return record;
};

// @route   GET /api/leaderboard?date=YYYY-MM-DD
// @desc    Get live or historical 3-day snapshots for prize distribution
router.get("/", async (req, res) => {
  try {
    const today = getDateString(0);
    const requestedDate = req.query.date || today;
    const isLiveToday = requestedDate === today;
    const metric = ["combined", "daily", "jap"].includes(req.query.metric)
      ? req.query.metric
      : "combined";
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    // Available viewing dates
    const availableDates = [
      { label: "Today (Live)", value: today },
      { label: "Yesterday", value: getDateString(-1) },
      { label: getDateString(-2), value: getDateString(-2) },
      { label: getDateString(-3), value: getDateString(-3) },
    ];

    // Case 1: Live Today's Leaderboard
    if (isLiveToday) {
      const devotees = await Devotee.find({
        role: "devotee",
        $or: [
          { lastQuizDate: today, dailyQuizAttempts: { $gte: 1 } },
          { lastJapDate: today, dailyCompletedMalas: { $gt: 0 } },
        ],
      })
        .select(
          "name lastQuizDate dailyQuizAttempts dailyQuizScore dailyQuizTimeTaken lastJapDate dailyCompletedMalas japScore totalScore",
        )
        .lean();

      const formatted = devotees
        .map((d) => {
          const todayQuizScore =
            d.lastQuizDate === today ? d.dailyQuizScore || 0 : 0;
          const quizTimeTaken =
            d.lastQuizDate === today ? d.dailyQuizTimeTaken || 999999 : 999999;

          const todayMalas =
            d.lastJapDate === today ? d.dailyCompletedMalas || 0 : 0;
          const todayJapPoints = todayMalas * 5;

          const combinedScore = todayQuizScore + todayJapPoints;

          return {
            _id: d._id,
            name: d.name,
            todayQuizScore,
            quizTimeTaken,
            completedMalas: todayMalas,
            japPoints: todayJapPoints,
            combinedScore,
          };
        })
        .sort((a, b) => {
          if (metric === "daily") {
            if (b.todayQuizScore !== a.todayQuizScore) {
              return b.todayQuizScore - a.todayQuizScore;
            }
            if (a.quizTimeTaken !== b.quizTimeTaken) {
              return a.quizTimeTaken - b.quizTimeTaken;
            }
            return b.completedMalas - a.completedMalas;
          }
          if (metric === "jap") {
            return b.completedMalas - a.completedMalas;
          }
          if (b.combinedScore !== a.combinedScore) {
            return b.combinedScore - a.combinedScore;
          }
          if (a.quizTimeTaken !== b.quizTimeTaken) {
            return a.quizTimeTaken - b.quizTimeTaken;
          }
          return b.completedMalas - a.completedMalas;
        });

      const paginated = formatted.slice(offset, offset + limit);

      return res.json({
        success: true,
        selectedDate: today,
        isLive: true,
        availableDates,
        devotees: paginated,
        hasMore: offset + paginated.length < formatted.length,
      });
    }

    // Case 2: Historical Snapshot (Past days)
    let snapshot = await DailyLeaderboard.findOne({
      date: requestedDate,
    }).lean();

    if (!snapshot) {
      snapshot = await generateAndSaveSnapshot(requestedDate, true);
    } else if (
      requestedDate === getDateString(-1) &&
      !snapshot.isFinalized
    ) {
      await finalizeSnapshot(requestedDate);
      snapshot = await DailyLeaderboard.findOne({
        date: requestedDate,
      }).lean();
    }

    const formattedPast = (snapshot?.rankings || []).map((r) => ({
      _id: r.devoteeId,
      name: r.name,
      todayQuizScore: r.quizScore,
      quizTimeTaken: r.quizTimeTaken || 999999,
      completedMalas: r.completedMalas,
      japPoints: r.japPoints,
      combinedScore: r.combinedScore,
      rank: r.rank,
    }));

    formattedPast.sort((a, b) => {
      if (metric === "daily") {
        if (b.todayQuizScore !== a.todayQuizScore) {
          return b.todayQuizScore - a.todayQuizScore;
        }
        if (a.quizTimeTaken !== b.quizTimeTaken) {
          return a.quizTimeTaken - b.quizTimeTaken;
        }
        return b.completedMalas - a.completedMalas;
      }
      if (metric === "jap") {
        return b.completedMalas - a.completedMalas;
      }
      if (b.combinedScore !== a.combinedScore) {
        return b.combinedScore - a.combinedScore;
      }
      if (a.quizTimeTaken !== b.quizTimeTaken) {
        return a.quizTimeTaken - b.quizTimeTaken;
      }
      return b.completedMalas - a.completedMalas;
    });
    const paginatedPast = formattedPast.slice(offset, offset + limit);

    res.json({
      success: true,
      selectedDate: requestedDate,
      isLive: false,
      availableDates,
      devotees: paginatedPast,
      hasMore: offset + paginatedPast.length < formattedPast.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/leaderboard/admin/trigger-rollover
// @desc    Admin manual trigger to test snapshot creation & new day reset immediately
router.post("/admin/trigger-rollover", protect, adminOnly, async (req, res) => {
  try {
    const result = await executeDailyMidnightRollover();
    res.json({
      success: true,
      message: "Daily midnight rollover executed successfully!",
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/leaderboard/admin/repair-snapshot
// @desc    Correct explicitly confirmed historical Naam Jap totals
router.post("/admin/repair-snapshot", protect, adminOnly, async (req, res) => {
  try {
    const { date, entries } = req.body;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
      !Array.isArray(entries) ||
      entries.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid date and at least one recovery entry are required.",
      });
    }

    const snapshot = await DailyLeaderboard.findOne({ date });
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: `Leaderboard snapshot not found for ${date}.`,
      });
    }

    const recoveredIds = new Set();
    entries.forEach(({ devoteeId, completedMalas }) => {
      if (!mongoose.Types.ObjectId.isValid(devoteeId)) {
        throw new Error(`Invalid devotee ID: ${devoteeId}`);
      }
      if (
        !Number.isInteger(completedMalas) ||
        completedMalas < 0 ||
        completedMalas > 100000
      ) {
        throw new Error(`Invalid mala count for devotee ${devoteeId}`);
      }

      const ranking = snapshot.rankings.find(
        (item) => item.devoteeId.toString() === devoteeId,
      );
      if (!ranking) {
        throw new Error(`Devotee ${devoteeId} is not in the snapshot.`);
      }

      ranking.completedMalas = completedMalas;
      ranking.japPoints = completedMalas * 5;
      ranking.combinedScore = ranking.quizScore + ranking.japPoints;
      recoveredIds.add(devoteeId);
    });

    snapshot.rankings.sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) {
        return b.combinedScore - a.combinedScore;
      }
      if (a.quizTimeTaken !== b.quizTimeTaken) {
        return a.quizTimeTaken - b.quizTimeTaken;
      }
      return b.completedMalas - a.completedMalas;
    });
    snapshot.rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });
    snapshot.isFinalized = true;
    await snapshot.save();

    res.json({
      success: true,
      date,
      recoveredDevotees: [...recoveredIds],
      rankings: snapshot.rankings,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
