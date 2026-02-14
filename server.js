const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/expenses", require("./routes/expenses"));

mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("MongoDB Connected Successfully"))
.catch(err=> console.log(err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>{
  console.log(`Server running on https://fintrackerr.onrender.com:${PORT}`);
});


