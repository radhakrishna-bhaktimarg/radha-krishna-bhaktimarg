const express = require("express");
const router = express.Router();
const Devotee = require("../models/Devotee");
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
    const { deltaMalas, deltaBeads, operationId } = req.body;
    const devotee = req.user;
    const today = getLocalDateString();

    const malasToAdd = Number(deltaMalas) || 0;
    const beadsToAdd = Number(deltaBeads) || 0;
    if (
      !operationId ||
      typeof operationId !== "string" ||
      operationId.length > 100 ||
      !Number.isInteger(malasToAdd) ||
      !Number.isInteger(beadsToAdd) ||
      !(
        (malasToAdd === 1 && beadsToAdd === 108) ||
        (malasToAdd === -1 && beadsToAdd === -1)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Naam Jap sync values.",
      });
    }

    const updatedDevotee = await Devotee.findOneAndUpdate(
      { _id: devotee._id, japOperationIds: { $ne: operationId } },
      [
        {
          $set: {
            dailyCompletedMalas: {
              $cond: [
                { $eq: ["$lastJapDate", today] },
                {
                  $max: [
                    0,
                    {
                      $add: [
                        { $ifNull: ["$dailyCompletedMalas", 0] },
                        malasToAdd,
                      ],
                    },
                  ],
                },
                Math.max(0, malasToAdd),
              ],
            },
            completedMalas: {
              $max: [
                0,
                {
                  $add: [{ $ifNull: ["$completedMalas", 0] }, malasToAdd],
                },
              ],
            },
            lifetimeJap: {
              $max: [
                0,
                {
                  $add: [{ $ifNull: ["$lifetimeJap", 0] }, beadsToAdd],
                },
              ],
            },
            lastJapDate: today,
            japOperationIds: {
              $slice: [
                { $concatArrays: [{ $ifNull: ["$japOperationIds", []] }, [operationId]] },
                -100,
              ],
            },
          },
        },
        {
          $set: {
            japScore: { $multiply: ["$dailyCompletedMalas", 5] },
            totalScore: {
              $add: [
                {
                  $cond: [
                    { $eq: ["$lastQuizDate", today] },
                    { $ifNull: ["$dailyQuizScore", 0] },
                    0,
                  ],
                },
                { $multiply: ["$dailyCompletedMalas", 5] },
              ],
            },
          },
        },
      ],
      { new: true },
    ).select("-password");

    if (!updatedDevotee) {
      const existingDevotee = await Devotee.findById(devotee._id)
        .select("-password")
        .lean();
      if (existingDevotee?.japOperationIds?.includes(operationId)) {
        return res.status(200).json({
          success: true,
          message: "Naam Jap sync already processed.",
          devotee: {
            name: existingDevotee.name,
            todayCompletedMalas: existingDevotee.dailyCompletedMalas,
            completedMalas: existingDevotee.completedMalas,
            lifetimeJap: existingDevotee.lifetimeJap,
            japScore: existingDevotee.japScore,
            totalScore: existingDevotee.totalScore,
          },
        });
      }
      return res.status(404).json({
        success: false,
        message: "Devotee account not found.",
      });
    }

    if (malasToAdd > 0) {
      await recordDailyLeaderboardEntry({
        devoteeId: updatedDevotee._id,
        name: updatedDevotee.name,
        date: today,
        completedMalas: updatedDevotee.dailyCompletedMalas,
      });
    }

    res.status(200).json({
      success: true,
      message: "Jap sadhana synced successfully",
      devotee: {
        name: updatedDevotee.name,
        todayCompletedMalas: updatedDevotee.dailyCompletedMalas,
        completedMalas: updatedDevotee.completedMalas,
        lifetimeJap: updatedDevotee.lifetimeJap,
        japScore: updatedDevotee.japScore,
        totalScore: updatedDevotee.totalScore,
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
      await Devotee.updateOne(
        { _id: devotee._id, lastJapDate: { $ne: today } },
        [
          {
            $set: {
              dailyCompletedMalas: 0,
              lastJapDate: today,
              japScore: 0,
              totalScore: {
                $cond: [
                  { $eq: ["$lastQuizDate", today] },
                  { $ifNull: ["$dailyQuizScore", 0] },
                  0,
                ],
              },
            },
          },
        ],
      );
    }

    const currentDevotee = await Devotee.findById(devotee._id)
      .select("dailyCompletedMalas completedMalas lifetimeJap japScore")
      .lean();

    res.json({
      success: true,
      todayCompletedMalas: currentDevotee?.dailyCompletedMalas || 0,
      completedMalas: currentDevotee?.completedMalas || 0,
      lifetimeJap: currentDevotee?.lifetimeJap || 0,
      japScore: currentDevotee?.japScore || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
