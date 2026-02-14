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
    res.status(500).json({ message: "Server error" });
  }

});


// ===== GET ALL EXPENSES =====
router.get("/", auth, async (req, res) => {

  try {
    const expenses = await Expense.find({ user: req.user.id });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});


// ===== DELETE EXPENSE =====
router.delete("/:id", auth, async (req, res) => {

  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});

// SMART SPENDING ANALYZER
router.get('/analyze', auth, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user.id });

        if (expenses.length === 0) {
            return res.json({
                status: "No Data",
                message: "Start adding expenses to see smart analysis."
            });
        }

        let total = 0;
        let categoryMap = {};
        let monthlyMap = {};

        expenses.forEach(exp => {
            total += exp.amount;

            // Category analysis
            if (!categoryMap[exp.category]) {
                categoryMap[exp.category] = 0;
            }
            categoryMap[exp.category] += exp.amount;

            // Monthly grouping
            const month = new Date(exp.date).getMonth();
            if (!monthlyMap[month]) {
                monthlyMap[month] = 0;
            }
            monthlyMap[month] += exp.amount;
        });

        // Find top spending category
        let topCategory = Object.keys(categoryMap).reduce((a, b) =>
            categoryMap[a] > categoryMap[b] ? a : b
        );

        // Risk Level Logic
let riskLevel = "Safe";

if (total > 0 && total <= 5000) riskLevel = "Safe";
if (total > 5000 && total <= 10000) riskLevel = "Moderate";
if (total > 10000) riskLevel = "High Risk";


        // AI Suggestion
        let suggestion = `You are spending most on ${topCategory}. Try reducing it by 10% to improve savings.`;

        res.json({
            totalSpent: total,
            topCategory,
            riskLevel,
            suggestion,
            categoryBreakdown: categoryMap,
            monthlyBreakdown: monthlyMap
        });

    } catch (err) {
        res.status(500).json({ message: "Analyzer error" });
    }
});

module.exports = router;