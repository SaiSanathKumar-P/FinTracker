window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
  window.history.go(1);
};

// Use relative path for production
const EXPENSE_API = "/api/expenses"; 
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
  const input = document.getElementById("budgetInput");
  monthlyBudget = Number(input.value);
  alert("Budget Saved Successfully!");
  loadExpenses();
}

// ADD EXPENSE
async function addExpense() {
  const title = document.getElementById("title").value;
  const category = document.getElementById("category-select").value; // This matches your hidden input ID
  const amount = document.getElementById("amount").value;

  if (!title || !category || !amount) {
    alert("Please select a category and fill all fields");
    return;
  }

  try {
    const res = await fetch(`${EXPENSE_API}/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // Consistent Bearer token
      },
      body: JSON.stringify({ title, category, amount })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Error adding expense");
      return;
    }

    // Reset fields
    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";
    
    // Reset custom select display
    const display = document.getElementById("selected-display");
    if(display) display.innerText = "Select Category";

    loadExpenses();
    loadSmartAnalysis();

  } catch (err) {
    console.error("Add Error:", err);
    alert("Connection to server failed. Ensure you are not using localhost!");
  }
}

// LOAD EXPENSES
async function loadExpenses() {
  try {
    const res = await fetch(EXPENSE_API, {
      headers: { "Authorization": `Bearer ${token}` } // Added Bearer
    });

    if (!res.ok) {
      console.log("Session expired or token error");
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
        <span>${exp.title} - ₹${exp.amount}</span>
        <button class="logout-btn" style="padding: 5px 10px; font-size: 12px;" onclick="deleteExpense('${exp._id}')">Delete</button>
      `;
      list.appendChild(li);
    });

    document.getElementById("totalAmount").innerText = total;

    if (monthlyBudget > 0) {
      const remaining = monthlyBudget - total;
      document.getElementById("remainingAmount").innerText = remaining;

      const percent = (total / monthlyBudget) * 100;
      document.getElementById("budgetUsage").innerText = percent.toFixed(1) + "% Used";
    }

  } catch (err) {
    console.error("Load Error:", err);
  }
}

// DELETE
async function deleteExpense(id) {
  try {
    const res = await fetch(`${EXPENSE_API}/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if(res.ok) {
      loadExpenses();
      loadSmartAnalysis();
    }
  } catch (err) {
    console.error("Delete Error:", err);
  }
}

// SMART ANALYZER
async function loadSmartAnalysis() {
  try {
    const res = await fetch(`${EXPENSE_API}/analyze`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    document.getElementById("aiTopCategory").innerText = data.topCategory || "-";
    document.getElementById("aiRisk").innerText = data.riskLevel || "-";
    document.getElementById("aiSuggestion").innerText = data.suggestion || "-";

  } catch (err) {
    console.error("Analysis Error:", err);
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
