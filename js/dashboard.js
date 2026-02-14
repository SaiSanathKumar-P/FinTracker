window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
  window.history.go(1);
};
const EXPENSE_API = "http://localhost:5000/api/expenses";
const token = localStorage.getItem("token");

let monthlyBudget = 0;

if (!token) {
  window.location.href = "login.html";
}


// UPDATE SLIDER
function updateBudgetValue(val) {
  document.getElementById("budgetValue").innerText = val;
}

// SAVE BUDGET
function setBudget() {
  monthlyBudget = Number(document.getElementById("budgetInput").value);
  alert("Budget Saved Successfully!");
  loadExpenses();
}

// ADD EXPENSE
async function addExpense() {

  const title = document.getElementById("title").value;
  const category = document.getElementById("category-select").value;
  const amount = document.getElementById("amount").value;

  if (!title || !category || !amount) {
    alert("Fill all fields");
    return;
  }

  try {

    const res = await fetch(EXPENSE_API + "/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title, category, amount })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Error adding expense");
      return;
    }

    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";

    loadExpenses();
    loadSmartAnalysis();

  } catch (err) {
    console.log(err);
    alert("Server error");
  }
}

// LOAD EXPENSES
async function loadExpenses() {

  try {

    const res = await fetch(EXPENSE_API, {
      headers: { "Authorization": token }
    });

    if (!res.ok) {
      console.log("Unauthorized or token error");
      return;
    }

    const expenses = await res.json();

    const list = document.getElementById("expenseList");
    list.innerHTML = "";

    let total = 0;

    expenses.forEach(exp => {

      total += Number(exp.amount);

      const li = document.createElement("li");
      li.innerHTML = `
        ${exp.title} - ₹${exp.amount}
        <button onclick="deleteExpense('${exp._id}')">Delete</button>
      `;

      list.appendChild(li);
    });

    document.getElementById("totalAmount").innerText = total;

    if (monthlyBudget > 0) {

      const remaining = monthlyBudget - total;
      document.getElementById("remainingAmount").innerText = remaining;

      const percent = (total / monthlyBudget) * 100;
      document.getElementById("budgetUsage").innerText =
        percent.toFixed(1) + "% Used";
    }

  } catch (err) {
    console.log(err);
  }
}

// DELETE
async function deleteExpense(id) {

  await fetch(EXPENSE_API + "/" + id, {
    method: "DELETE",
    headers: { "Authorization": token }
  });

  loadExpenses();
  loadSmartAnalysis();
}

// SMART ANALYZER
async function loadSmartAnalysis() {

  try {

    const res = await fetch("http://localhost:5000/api/expenses/analyze", {
  headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();

    document.getElementById("aiTopCategory").innerText =
      data.topCategory || "-";

    document.getElementById("aiRisk").innerText =
      data.riskLevel || "-";

    document.getElementById("aiSuggestion").innerText =
      data.suggestion || "-";

  } catch (err) {
    console.log(err);
  }
}

// LOGOUT
function logoutUser() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// INITIAL LOAD
loadExpenses();
loadSmartAnalysis();
