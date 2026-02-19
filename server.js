// ================================
// FinTrack Server.js (PRODUCTION)
// ================================

require("dotenv").config();
require("./config/passport");

const connectDB = require("./config/db");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const path = require("path");
const GitHubStrategy = require("passport-github2").Strategy;

const app = express();

/* ===============================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   SESSION STORE (MongoDB)
================================ */

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fintrack_session_2026",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI
    })
  })
);

/* ===============================
   PASSPORT INIT
================================ */

app.use(passport.initialize());
app.use(passport.session());

/* ===============================
   GOOGLE STRATEGY
================================ */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://fintracker-student.vercel.app/api/auth/google/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "https://fintracker-student.vercel.app/api/auth/github/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

/* ===============================
   GOOGLE AUTH ROUTES
================================ */

app.get(
  "/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login.html" }),
  (req, res) => {
    const token = jwt.sign(
  { id: req.user.id || req.user.emails[0].value },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);
    res.redirect(`/dashboard.html?token=${token}`);
  }
);
app.get(
  "/api/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

app.get(
  "/api/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login.html" }),
  (req,res)=>{
    const token = jwt.sign(
  { id: req.user.id || req.user.username },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);


    res.redirect(`/dashboard.html?token=${token}`);
  }
);

/* ===============================
   STATIC FRONTEND
================================ */

app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   API ROUTES
================================ */
connectDB();
const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

/* ===============================
   FALLBACK ROUTE
================================ */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// DATABASE CONNECTION (Vercel)
// ===============================

// ===============================
// EXPORT APP FOR VERCEL
// ===============================

module.exports = app;
