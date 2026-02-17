// ================================
// FinTrack Server
// ================================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");

const app = express();

/* ================================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "fintrack_session_secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

/* ================================
   PASSPORT GOOGLE STRATEGY
================================ */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

/* ================================
   GOOGLE AUTH ROUTES
================================ */

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
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

/* ================================
   API ROUTES
================================ */

const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

/* ================================
   SERVE FRONTEND
================================ */

app.use(express.static("public"));

app.get("*", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

/* ================================
   DATABASE + START SERVER
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
