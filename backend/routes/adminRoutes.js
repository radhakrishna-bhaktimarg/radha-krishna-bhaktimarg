const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getAppDateString } = require("../utils/dailyLeaderboardHelper");
const Devotee = require("../models/Devotee");
const Question = require("../models/Question");

// @route   GET /api/admin/stats
// @desc    Get dashboard metrics (total devotees, total malas, total pledges)
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalDevotees = await Devotee.countDocuments();
    const devotees = await Devotee.find().select("-password");

    const totalMalas = devotees.reduce(
      (acc, d) => acc + (d.completedMalas || 0),
      0,
    );
    const totalJap = devotees.reduce((acc, d) => acc + (d.lifetimeJap || 0), 0);
    const totalSevaPledged = devotees.reduce(
      (acc, d) => acc + (d.totalSevaPledged || 0),
      0,
    );

    const questionsCount = await Question.countDocuments();

    res.json({
      success: true,
      stats: {
        totalDevotees,
        totalMalas,
        totalJap,
        totalSevaPledged,
        questionsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/admin/questions
// @desc    Add a new quiz question
router.post("/questions", protect, adminOnly, async (req, res) => {
  try {
    const { question, options, correctIndex, explanation, scheduledDate } =
      req.body;

    if (
      !question ||
      !options ||
      options.length < 2 ||
      correctIndex === undefined
    ) {
      return res
        .status(400)
        .json({ message: "All question fields are required" });
    }

    // Default to today's date (YYYY-MM-DD) if not explicitly passed
    const targetDate = scheduledDate || getAppDateString();

    const newQuestion = await Question.create({
      question: question.trim(),
      options,
      correctIndex: Number(correctIndex),
      explanation: explanation || "",
      scheduledDate: targetDate,
    });

    res.status(201).json({
      success: true,
      message: `Question scheduled for ${targetDate}`,
      question: newQuestion,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/admin/devotees
// @desc    List all devotees with their scores
router.get("/devotees", protect, adminOnly, async (req, res) => {
  try {
    const devotees = await Devotee.find()
      .select("-password")
      .sort({ totalScore: -1 });

    res.json({ success: true, devotees });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
