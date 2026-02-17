// ================================
// FinTrack Server.js (FINAL)
// ================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

/* ===============================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===============================
   SESSION SETUP
================================ */

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fintrack_secret",
    resave: false,
    saveUninitialized: false
  })
);

/* ===============================
   PASSPORT INITIALIZE
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
   GOOGLE LOGIN ROUTES
================================ */

app.get("/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/api/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login.html" }),
  (req, res) => {

    const token = jwt.sign(
      { email: req.user.emails[0].value },
      process.env.JWT_SECRET || "fintrack_jwt_secret",
      { expiresIn: "7d" }
    );

    res.redirect(`/dashboard.html?token=${token}`);
  }
);

/* ===============================
   TEST ROUTE
================================ */

app.get("/api/test", (req, res) => {
  res.json({ message: "API Working Fine" });
});

/* ===============================
   CONNECT MONGO & START SERVER
================================ */

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log("Server running on port", PORT)
    );
  })
  .catch(err => console.log("Mongo Error:", err));
