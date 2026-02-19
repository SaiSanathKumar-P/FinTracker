const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const User = require("../models/User");

const router = express.Router();

/* ============================
   REGISTER
============================ */

router.post("/register", async (req, res) => {
  try {
    const { name, email, college, year, password } = req.body;

    // ✅ Normalize email
    const normalizedEmail = email.toLowerCase();

    // ✅ Check existing user
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // ✅ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // ✅ Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      college,
      year,
      password: hashed
    });

    // ✅ Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token });

  } catch (err) {

    // ✅ Handle duplicate key error from MongoDB
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }

    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});


/* ============================
   LOGIN
============================ */

router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    // ✅ normalize email
    email = email.toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
