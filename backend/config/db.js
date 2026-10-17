const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (global.__mongooseConnection) {
    return global.__mongooseConnection;
  }

  global.__mongooseConnection = mongoose
    .connect(process.env.MONGO_URI)
    .then((connection) => {
      console.log(`MongoDB Connected: ${connection.connection.host}`);
      return connection.connection;
    })
    .catch((error) => {
      global.__mongooseConnection = null;
      console.error(`Database Connection Error: ${error.message}`);
      throw error;
    });

  return global.__mongooseConnection;
};

module.exports = connectDB;
