const express = require("express");
const Expense = require("../models/Expense");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// ===== ADD EXPENSE =====
router.post("/add", auth, async (req, res) => {
  try {
    const { title, category, amount } = req.body;

    const expense = new Expense({
      user: req.user.id,
      title,
      category,
      amount
    });

    await expense.save();
    res.json({ message: "Expense added successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== GET EXPENSES =====
router.get("/", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===== DELETE =====
router.delete("/:id", auth, async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===== SMART ANALYZER =====
router.get("/analyze", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user.id });

    if (expenses.length === 0) {
      return res.json({
        topCategory: "-",
        riskLevel: "-",
        suggestion: "Add expenses to see analysis"
      });
    }

    let total = 0;
    let categoryMap = {};

    expenses.forEach(e => {
      total += e.amount;
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    let topCategory = Object.keys(categoryMap)
      .reduce((a,b)=>categoryMap[a]>categoryMap[b]?a:b);

    let risk = "Safe";
    if(total>5000) risk="Moderate";
    if(total>10000) risk="High";

    res.json({
      topCategory,
      riskLevel: risk,
      suggestion: `Try reducing spending on ${topCategory}`
    });

  } catch (err) {
    res.status(500).json({ message: "Analyzer error" });
  }
});

module.exports = router;
