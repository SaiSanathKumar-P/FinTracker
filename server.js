// ================================
// FinTrack Server.js (PRODUCTION)
// ================================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();

/* ===============================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   SESSION (Required for Google OAuth)
================================ */

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fintrack_secret",
    resave: false,
    saveUninitialized: false
  })
);

/* ===============================
   PASSPORT INIT
================================ */

app.use(passport.initialize());

/* ===============================
   GOOGLE STRATEGY
================================ */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

/* ===============================
   STATIC FRONTEND
================================ */

app.use(express.static("public"));

/* ===============================
   ROUTES
================================ */

const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

/* ===============================
   FALLBACK → SPA ROUTING
================================ */

app.get("*", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

/* ===============================
   DATABASE + SERVER
================================ */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch(err => console.log("Mongo Error:", err));
