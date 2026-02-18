// ================================
// FinTrack Server.js (PRODUCTION)
// ================================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const path = require("path");

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
      callbackURL: "https://fintracker-l6hp.onrender.com/api/auth/google/callback"
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
      { email: req.user.emails[0].value },
      process.env.JWT_SECRET || "fintrack_super_secret",
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
