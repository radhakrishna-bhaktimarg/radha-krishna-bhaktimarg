const dotenv = require("dotenv");
const app = require("../app");
const connectDB = require("../config/db");

dotenv.config();

let databaseReady;

module.exports = async (req, res) => {
  try {
    databaseReady ||= connectDB();
    await databaseReady;
    return app(req, res);
  } catch (error) {
    databaseReady = null;
    console.error("Vercel API initialization error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Backend initialization failed",
    });
  }
};
