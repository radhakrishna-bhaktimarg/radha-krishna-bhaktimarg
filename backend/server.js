const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");
const { startMidnightCron } = require("./cron/dailyMidnightCron");
const app = require("./app");

connectDB().catch(() => {
  process.exit(1);
});
startMidnightCron();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
