const express = require("express");
const router = express.Router();
const Katha = require("../models/Katha");
const Devotee = require("../models/Devotee");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { autoTranslateKathaAndQuestions } = require("../utils/translateHelper");
const {
  getAppDateString,
  recordDailyLeaderboardEntry,
} = require("../utils/dailyLeaderboardHelper");
const { withLeaderboardLock } = require("../utils/leaderboardLock");

const translationJobs = new Map();

const getTodayDateString = () => {
  return getAppDateString();
};

const getCurrentWeekTag = () => {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

const hasCompleteLanguageContent = (languageContent, questionCount) =>
  Boolean(
    languageContent?.title &&
      languageContent?.content &&
      Array.isArray(languageContent.questions) &&
      languageContent.questions.length === questionCount &&
      languageContent.questions.every(
        (question) =>
          question?.question &&
          Array.isArray(question.options) &&
          question.options.length > 0 &&
          question.options.every(Boolean),
      ),
  );

const isFallbackLanguageContent = (languageContent, sourceContent) =>
  languageContent?.title === sourceContent.title &&
  languageContent?.content === sourceContent.content &&
  languageContent.questions?.every(
    (question, index) =>
      question.question === sourceContent.questions[index]?.question &&
      question.options?.every(
        (option, optionIndex) =>
          option === sourceContent.questions[index]?.options[optionIndex],
      ),
  );

// -------------------------------------------------------------
// @route   GET /api/quiz/today-katha
// -------------------------------------------------------------
router.get("/today-katha", protect, async (req, res) => {
  try {
    const today = getTodayDateString();
    const devotee = req.user;

    let katha = await Katha.findOne({ scheduledDate: today }).lean();

    if (!katha) {
      return res.json({
        success: true,
        hasKatha: false,
        today,
        message:
          "Till this time no Katha or Quiz is added, please come back after some time.",
      });
    }

    const hasAttemptedToday =
      devotee.lastQuizDate === today && (devotee.dailyQuizAttempts || 0) >= 1;

    const languages = katha.languages || {};
    const sourceContent = {
      title: katha.title,
      content: katha.content,
      questions: katha.questions || [],
    };
    const translationCodes = ["en", "mr", "sa"];
    const missingTranslations = translationCodes.some(
      (code) =>
        !hasCompleteLanguageContent(
          languages[code],
          sourceContent.questions.length,
        ) || isFallbackLanguageContent(languages[code], sourceContent),
    );

    if (missingTranslations) {
      const translationKey = katha._id.toString();
      let translationJob = translationJobs.get(translationKey);
      if (!translationJob) {
        translationJob = autoTranslateKathaAndQuestions({
          ...sourceContent,
        }).finally(() => translationJobs.delete(translationKey));
        translationJobs.set(translationKey, translationJob);
      }

      const generatedLanguages = await translationJob;

      katha = await Katha.findByIdAndUpdate(
        katha._id,
        { $set: { languages: generatedLanguages } },
        { new: true, lean: true },
      );
    }

    // Sanitize default Hindi questions (strip correctIndex)
    const sanitizedQuestions = (katha.questions || []).map((q, idx) => ({
      _id: q._id ? q._id.toString() : String(idx),
      questionIndex: idx,
      question: q.question,
      options: q.options,
      explanation: q.explanation || "",
    }));

    // Attach question IDs and indices to language variants
    const languagesWithQuestionIds = katha.languages || {};
    ["en", "mr", "sa"].forEach((code) => {
      if (languagesWithQuestionIds[code]?.questions) {
        languagesWithQuestionIds[code].questions = languagesWithQuestionIds[
          code
        ].questions.map((q, idx) => ({
          ...q,
          _id: sanitizedQuestions[idx]?._id || String(idx),
          questionIndex: idx,
        }));
      }
    });

    res.json({
      success: true,
      hasKatha: true,
      today,
      alreadyAttempted: hasAttemptedToday,
      dailyQuizScore:
        devotee.lastQuizDate === today ? devotee.dailyQuizScore : 0,
      dailyQuizCorrectCount:
        devotee.lastQuizDate === today
          ? devotee.dailyQuizCorrectCount ||
            Math.round(((devotee.dailyQuizScore || 0) / 100) * (katha.questions || []).length)
          : 0,
      katha: {
        _id: katha._id,
        title: katha.title,
        content: katha.content,
        mediaUrl: katha.mediaUrl || "",
        scheduledDate: katha.scheduledDate,
      },
      questions: sanitizedQuestions,
      languages: {
        hi: {
          title: katha.title,
          content: katha.content,
          questions: sanitizedQuestions,
        },
        ...languagesWithQuestionIds,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// @route   POST /api/quiz/submit-daily
// -------------------------------------------------------------
const submitDailyQuiz = async (req, res, assertLock) => {
  try {
    const { answers, timeTakenSeconds } = req.body;
    const devotee = req.user;
    const today = getTodayDateString();
    const currentWeek = getCurrentWeekTag();

    if (
      devotee.lastQuizDate === today &&
      (devotee.dailyQuizAttempts || 0) >= 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Aap aaj ka attempt pehle hi upyog kar chuke hain.",
      });
    }

    const katha = await Katha.findOne({ scheduledDate: today }).lean();
    if (!katha) {
      return res
        .status(404)
        .json({ message: "Aaj ki katha uplabdh nahi hai." });
    }

    const totalQuestions = katha.questions.length;
    if (totalQuestions === 0) {
      return res
        .status(400)
        .json({ message: "Is katha me koi prashna nahi hain." });
    }

    let correctCount = 0;
    const answeredQuestions = new Set();

    // Flexible answer evaluation: Matches by ID or question array index
    (answers || []).forEach((ans, fallbackIndex) => {
      let targetQ = null;

      if (ans.questionId) {
        targetQ = katha.questions.find(
          (q) => q._id && q._id.toString() === ans.questionId.toString(),
        );
      }

      if (!targetQ) {
        const qIdx =
          ans.questionIndex !== undefined ? ans.questionIndex : fallbackIndex;
        targetQ = katha.questions[qIdx];
      }

      const questionIndex = targetQ ? katha.questions.indexOf(targetQ) : -1;
      const questionKey = `index:${questionIndex}`;
      if (!targetQ || answeredQuestions.has(questionKey)) return;
      answeredQuestions.add(questionKey);

      if (
        targetQ &&
        Number(targetQ.correctIndex) === Number(ans.selectedIndex)
      ) {
        correctCount += 1;
      }
    });

    const earnedScore = Math.round((correctCount / totalQuestions) * 100);

    const completedTime = Math.max(
      1,
      Number(timeTakenSeconds) || 999999,
    );
    const updatedDevotee = await Devotee.findOneAndUpdate(
      {
        _id: devotee._id,
        lastQuizDate: { $ne: today },
      },
      [
        {
          $set: {
            dailyQuizScore: earnedScore,
            dailyQuizCorrectCount: correctCount,
            dailyQuizTimeTaken: completedTime,
            dailyQuizAttempts: 1,
            lastQuizDate: today,
            quizScore: { $add: [{ $ifNull: ["$quizScore", 0] }, earnedScore] },
            weeklyQuizScore: {
              $cond: [
                { $eq: ["$lastActiveWeek", currentWeek] },
                { $add: [{ $ifNull: ["$weeklyQuizScore", 0] }, earnedScore] },
                earnedScore,
              ],
            },
            weeklyScore: {
              $cond: [
                { $eq: ["$lastActiveWeek", currentWeek] },
                { $add: [{ $ifNull: ["$weeklyScore", 0] }, earnedScore] },
                earnedScore,
              ],
            },
            weeklyJapScore: {
              $cond: [
                { $eq: ["$lastActiveWeek", currentWeek] },
                { $ifNull: ["$weeklyJapScore", 0] },
                0,
              ],
            },
            lastActiveWeek: currentWeek,
          },
        },
        {
          $set: {
            totalScore: {
              $add: [
                earnedScore,
                {
                  $cond: [
                    { $eq: ["$lastJapDate", today] },
                    { $multiply: [{ $ifNull: ["$dailyCompletedMalas", 0] }, 5] },
                    0,
                  ],
                },
              ],
            },
          },
        },
      ],
      { new: true },
    ).select("-password");

    if (!updatedDevotee) {
      return res.status(400).json({
        success: false,
        message: "Aap aaj ka attempt pehle hi upyog kar chuke hain.",
      });
    }

    await recordDailyLeaderboardEntry({
      devoteeId: updatedDevotee._id,
      name: updatedDevotee.name,
      date: today,
      quizScore: updatedDevotee.dailyQuizScore,
      quizTimeTaken: updatedDevotee.dailyQuizTimeTaken,
      assertLock,
    });

    res.json({
      success: true,
      correctCount,
      totalQuestions,
      earnedScore,
      dailyQuizScore: updatedDevotee.dailyQuizScore,
      dailyQuizCorrectCount: updatedDevotee.dailyQuizCorrectCount,
      dailyQuizTimeTaken: updatedDevotee.dailyQuizTimeTaken,
      totalScore: updatedDevotee.totalScore,
      message: "Daily quiz safalpurvak darj hua!",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

router.post("/submit-daily", protect, async (req, res) => {
  try {
    return await withLeaderboardLock((assertLock) =>
      submitDailyQuiz(req, res, assertLock),
    );
  } catch (error) {
    const statusCode =
      error.code === "LEADERBOARD_LOCK_TIMEOUT" ||
      error.code === "LEADERBOARD_LOCK_LOST"
        ? 503
        : 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// @route   POST /api/quiz/admin/katha (Auto-translates on Save)
// -------------------------------------------------------------
router.post("/admin/katha", protect, adminOnly, async (req, res) => {
  try {
    const { title, content, mediaUrl, scheduledDate, questions } = req.body;

    if (!title || !content || !scheduledDate) {
      return res
        .status(400)
        .json({ message: "Title, content aur scheduledDate anivarya hain." });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res
        .status(400)
        .json({ message: "Kam se kam ek prashna hona anivarya hai." });
    }

    const today = getTodayDateString();
    const maxDateString = getAppDateString(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    );

    if (scheduledDate < today) {
      return res.status(400).json({
        message: "Aap beete huye din ke liye schedule nahi kar sakte.",
      });
    }

    if (scheduledDate > maxDateString) {
      return res
        .status(400)
        .json({ message: "Aap agle 30 dino tak hi schedule kar sakte hain." });
    }

    let languages = {};
    try {
      languages = await autoTranslateKathaAndQuestions({
        title,
        content,
        questions,
      });
    } catch (tErr) {
      console.error("Auto-translate error:", tErr);
    }

    const updatedKatha = await Katha.findOneAndUpdate(
      { scheduledDate },
      { title, content, mediaUrl, scheduledDate, questions, languages },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const pastKathas = await Katha.find({
      scheduledDate: { $lt: today },
    }).sort({ scheduledDate: -1 });

    if (pastKathas.length > 7) {
      const expiredIds = pastKathas.slice(7).map((k) => k._id);
      await Katha.deleteMany({ _id: { $in: expiredIds } });
    }

    res.status(201).json({
      success: true,
      message: `Katha '${title}' saved with auto-translations for ${scheduledDate}!`,
      katha: updatedKatha,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset endpoint for testing quiz attempts
router.get("/reset-my-attempt", async (req, res) => {
  try {
    await Devotee.updateMany(
      {},
      {
        lastQuizDate: null,
        dailyQuizAttempts: 0,
        dailyQuizScore: 0,
        dailyQuizTimeTaken: 999999,
      },
    );
    res.send(
      "All devotee quiz attempts have been reset successfully! Refresh your Quiz tab.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
