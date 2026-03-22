// config/db.js — MongoDB connection using Mongoose
// Called once at server startup to establish the database connection

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // MONGO_URI comes from .env — never hardcode connection strings!
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // Exit the process if we can't connect — no point running without a DB
    process.exit(1);
  }
};

module.exports = connectDB;
