const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended:true }));

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.get("/", (req,res)=>{
  res.send("FinTrack Backend Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server started"));

