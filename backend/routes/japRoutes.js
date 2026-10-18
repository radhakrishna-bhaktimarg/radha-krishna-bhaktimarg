const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  recordDailyLeaderboardEntry,
  getAppDateString,
} = require("../utils/dailyLeaderboardHelper");

const protect = authMiddleware.protect || authMiddleware;

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = () => {
  return getAppDateString();
};

// @route   POST /api/jap/sync
// @desc    Increment completed mala and lifetime beads by delta
router.post("/sync", protect, async (req, res) => {
  try {
    const { deltaMalas, deltaBeads } = req.body;
    const devotee = req.user;
    const today = getLocalDateString();

    // Reset daily malas if chanting on a new calendar date
    if (devotee.lastJapDate !== today) {
      devotee.dailyCompletedMalas = 0;
      devotee.lastJapDate = today;
    }

    const malasToAdd = Number(deltaMalas) || 0;
    const beadsToAdd = Number(deltaBeads) || 0;

    // Directly increment daily and lifetime totals
    devotee.dailyCompletedMalas = Math.max(
      0,
      (devotee.dailyCompletedMalas || 0) + malasToAdd,
    );
    devotee.completedMalas = Math.max(
      0,
      (devotee.completedMalas || 0) + malasToAdd,
    );
    devotee.lifetimeJap = Math.max(0, (devotee.lifetimeJap || 0) + beadsToAdd);

    // 5 points per mala
    devotee.japScore = (devotee.dailyCompletedMalas || 0) * 5;
    devotee.totalScore = (devotee.dailyQuizScore || 0) + devotee.japScore;

    await devotee.save();
    if (malasToAdd > 0) {
      await recordDailyLeaderboardEntry({
        devoteeId: devotee._id,
        name: devotee.name,
        date: today,
        completedMalas: devotee.dailyCompletedMalas,
      });
    }

    res.status(200).json({
      success: true,
      message: "Jap sadhana synced successfully",
      devotee: {
        name: devotee.name,
        todayCompletedMalas: devotee.dailyCompletedMalas,
        completedMalas: devotee.completedMalas,
        lifetimeJap: devotee.lifetimeJap,
        japScore: devotee.japScore,
        totalScore: devotee.totalScore,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/jap/stats
// @desc    Fetch latest saved sadhana counts for initial page render
router.get("/stats", protect, async (req, res) => {
  try {
    const devotee = req.user;
    const today = getLocalDateString();

    if (devotee.lastJapDate !== today) {
      devotee.dailyCompletedMalas = 0;
      devotee.lastJapDate = today;
      devotee.japScore = 0;
      devotee.totalScore = devotee.dailyQuizScore || 0;
      await devotee.save();
    }

    res.json({
      success: true,
      todayCompletedMalas: devotee.dailyCompletedMalas || 0,
      completedMalas: devotee.completedMalas || 0,
      lifetimeJap: devotee.lifetimeJap || 0,
      japScore: devotee.japScore || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
