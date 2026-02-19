const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGO_URI);

  isConnected = true;
  console.log("MongoDB Connected");
}

module.exports = connectDB;
