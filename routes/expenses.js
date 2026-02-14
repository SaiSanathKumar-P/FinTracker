const express = require("express");
const Expense = require("../models/Expense");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// ADD EXPENSE
router.post("/add", auth, async (req,res)=>{
  try{
    const { title, category, amount } = req.body;

    const expense = new Expense({
      user: req.user.id,
      title,
      category,
      amount
    });

    await expense.save();
    res.json({ message:"Expense added" });

  }catch(err){
    res.status(500).json({ message:"Server error" });
  }
});

// GET EXPENSES
router.get("/", auth, async (req,res)=>{
  const expenses = await Expense.find({ user:req.user.id });
  res.json(expenses);
});

// DELETE
router.delete("/:id", auth, async (req,res)=>{
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ message:"Deleted" });
});

// ANALYZE
router.get("/analyze", auth, async (req,res)=>{
  const expenses = await Expense.find({ user:req.user.id });

  if(expenses.length===0){
    return res.json({
      topCategory:"-",
      riskLevel:"-",
      suggestion:"Start adding expenses"
    });
  }

  let total=0;
  let map={};

  expenses.forEach(e=>{
    total+=e.amount;
    map[e.category]=(map[e.category]||0)+e.amount;
  });

  const topCategory = Object.keys(map)
    .reduce((a,b)=>map[a]>map[b]?a:b);

  let risk="Safe";
  if(total>5000) risk="Moderate";
  if(total>10000) risk="High";

  res.json({
    topCategory,
    riskLevel:risk,
    suggestion:`Reduce ${topCategory} spending`
  });
});

module.exports = router;
