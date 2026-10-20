const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const devoteeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["devotee", "admin"],
      default: "devotee",
    },

    // Daily Quiz & Single-Attempt Tracking
    lastQuizDate: {
      type: String,
      default: null, // "YYYY-MM-DD"
    },
    dailyQuizAttempts: {
      type: Number,
      default: 0, // strictly 0 or 1
    },
    dailyQuizScore: {
      type: Number,
      default: 0, // Today's quiz score (0 to 100)
    },
    dailyQuizCorrectCount: {
      type: Number,
      default: 0,
    },
    dailyQuizTimeTaken: {
      type: Number,
      default: 999999, // Time in seconds (lower is faster; defaults high for unattempted)
    },

    // Daily & Lifetime Jap tracking
    lastJapDate: {
      type: String,
      default: null, // "YYYY-MM-DD"
    },
    dailyCompletedMalas: {
      type: Number,
      default: 0, // Today's malas only
    },
    completedMalas: {
      type: Number,
      default: 0, // Lifetime total malas
    },
    lifetimeJap: {
      type: Number,
      default: 0,
    },
    japOperationIds: {
      type: [String],
      default: [],
    },

    // Cumulative / Lifetime totals
    quizScore: {
      type: Number,
      default: 0,
    },
    japScore: {
      type: Number,
      default: 0, // Lifetime malas * 5
    },
    totalScore: {
      type: Number,
      default: 0, // quizScore + japScore
    },

    // Weekly metrics
    weeklyScore: {
      type: Number,
      default: 0,
    },
    weeklyQuizScore: {
      type: Number,
      default: 0,
    },
    weeklyJapScore: {
      type: Number,
      default: 0,
    },
    lastActiveWeek: {
      type: String,
      default: null, // "YYYY-Www"
    },
  },
  { timestamps: true }
);

// Auto-hash password and synchronize lifetime Jap & Total scores before saving
devoteeSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Client rule: 5 points per mala
  this.japScore = (this.completedMalas || 0) * 5;
  this.totalScore = (this.quizScore || 0) + this.japScore;
});

// Compare password during login
devoteeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Devotee", devoteeSchema);