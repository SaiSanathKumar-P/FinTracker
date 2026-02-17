const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static("public"));

// Routes
const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

// Root test
app.get("/api/test", (req,res)=>{
  res.json({message:"API Working"});
});

// Connect DB & start server
mongoose.connect(process.env.MONGO_URI)
.then(()=>{
  console.log("MongoDB Connected");
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, ()=> console.log("Server running on", PORT));
})
.catch(err=> console.log(err));
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const jwt = require("jsonwebtoken");

app.use(session({
  secret: "fintrack_secret",
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login.html" }),
  (req, res) => {

    const token = jwt.sign(
      { email: req.user.emails[0].value },
      "fintrack_jwt_secret",
      { expiresIn: "7d" }
    );

    res.redirect(`/dashboard.html?token=${token}`);
  }
);


