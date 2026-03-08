/**
 * FinTrack Dashboard – Professional with Budget Toggle & Glow Effects
 */

const API_BASE = '/api/expenses';
const TOKEN_KEY = 'token';
const MOCK_MODE_KEY = 'finTrack_useMock';
let monthlyBudget = 0;
let useMock = false;
let mockExpenses = [];
let mockBudget = 0;
let chartInstance = null;      // pie chart
let timelineChartInstance = null;  // bar chart

// Custom categories array (predefined + user added)
let categories = [
  { value: 'Food', label: '🍔 Food' },
  { value: 'Transport', label: '🚗 Transport' },
  { value: 'Shopping', label: '🛍 Shopping' },
  { value: 'Education', label: '📚 Education' },
  { value: 'Entertainment', label: '🎬 Entertainment' }
];

// ================= COLOR REGISTRY =================
// First color is always blue (#38bdf8), others are random vibrant colors
let categoryColors = {};

function getRandomColor() {
  // Generate vibrant colors with good saturation and lightness
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 80%, 65%)`; // 65% lightness for better visibility on dark backgrounds
}

function getCategoryColor(category) {
  if (!categoryColors[category]) {

    // First ever category → BLUE
    if (Object.keys(categoryColors).length === 0) {
      categoryColors[category] = '#38bdf8';
    }

    // All others → RANDOM (never blue)
    else {
      let color;
      do {
        color = getRandomColor();
      } while (color === '#38bdf8');   // prevent blue duplication

      categoryColors[category] = color;
    }

    // Save colors
    localStorage.setItem(
      "finTrack_categoryColors",
      JSON.stringify(categoryColors)
    );
  }

  return categoryColors[category];
}
// At the very top of your dashboard.js, after the constants, add:
let elements; // Declare elements globally

// Then in your getElements function, make sure it returns the object
function getElements() {
  return {
    totalAmount: document.getElementById('totalAmount'),
    remainingAmount: document.getElementById('remainingAmount'),
    budgetUsage: document.getElementById('budgetUsage'),
    budgetInput: document.getElementById('budgetInput'),
    budgetValue: document.getElementById('budgetValue'),
    saveBudgetBtn: document.getElementById('saveBudgetBtn'),
    expenseList: document.getElementById('expenseList'),
    addExpenseBtn: document.getElementById('addExpenseBtn'),
    titleInput: document.getElementById('title'),
    amountInput: document.getElementById('amount'),
    categoryHidden: document.getElementById('category-select'),
    selectedDisplay: document.getElementById('selected-display'),
    categoryTrigger: document.getElementById('categoryTrigger'),
    categoryWrapper: document.getElementById('categoryWrapper'),
    dropdownMenu: document.getElementById('dropdownMenu'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    removeCategoryBtn: document.getElementById('removeCategoryBtn'),
    aiTopCategory: document.getElementById('aiTopCategory'),
    aiRisk: document.getElementById('aiRisk'),
    aiSuggestion: document.getElementById('aiSuggestion'),
    logoutBtn: document.getElementById('logoutBtn'),
    recentList: document.getElementById('recentList'),
    chartContainer: document.getElementById('chartContainer'),
    aiMonthly: document.getElementById('aiMonthly'),
    aiWeekly: document.getElementById('aiWeekly'),
    aiDaily: document.getElementById('aiDaily'),
  };
}
const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get("token");

if (urlToken) {
  localStorage.setItem(TOKEN_KEY, urlToken);
  window.history.replaceState({}, document.title, "dashboard.html");
}

// ========== Utilities ==========
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function requireAuth() {
  const token = localStorage.getItem("token");

  if (!token || token === "undefined" || token === "null") {
    localStorage.clear();
    window.location.replace("login.html");
  }
}
function showMessage(msg) { alert(msg); }

function setOfflineMode(enabled) {
  useMock = enabled;
  localStorage.setItem(MOCK_MODE_KEY, enabled ? 'true' : 'false');
}

function loadMockFromStorage() {
  try {
    const stored = localStorage.getItem('finTrack_mockExpenses');
    mockExpenses = stored ? JSON.parse(stored) : [];
    const storedBudget = localStorage.getItem('finTrack_mockBudget');
    mockBudget = storedBudget ? parseFloat(storedBudget) : 0;
    const storedCats = localStorage.getItem('finTrack_categories');
    if (storedCats) categories = JSON.parse(storedCats);
  } catch { 
    mockExpenses = []; 
    mockBudget = 0; 
  }
}

function saveMockToStorage() {
  localStorage.setItem('finTrack_mockExpenses', JSON.stringify(mockExpenses));
  localStorage.setItem('finTrack_mockBudget', mockBudget.toString());
  localStorage.setItem('finTrack_categories', JSON.stringify(categories));
}

// ========== API with fallback ==========
async function apiRequest(url, options = {}) {
  if (useMock) return handleMockRequest(url, options);

  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.replace("login.html");
      return;
    }

    const data = response.status !== 204
      ? await response.json()
      : null;

    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}`);
    }

    return data;

  } catch (error) {
    console.error("API ERROR:", error);
    throw error;
  }
}

function handleMockRequest(url, options) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;
  if (method === 'GET' && url === '') return Promise.resolve(mockExpenses);
  if (method === 'POST' && url === '/add') {
    const newExpense = { 
      _id: 'mock_' + Date.now(), 
      title: body.title, 
      category: body.category, 
      amount: body.amount, 
      date: new Date().toISOString() 
    };
    mockExpenses.push(newExpense); 
    saveMockToStorage(); 
    return Promise.resolve(newExpense);
  }
  if (method === 'DELETE' && url.startsWith('/')) {
    const id = url.substring(1); 
    mockExpenses = mockExpenses.filter(e => e._id !== id); 
    saveMockToStorage(); 
    return Promise.resolve(null);
  }
  if (method === 'POST' && url === '/budget') { 
    mockBudget = body.budget; 
    saveMockToStorage(); 
    return Promise.resolve({}); 
  }
  if (method === 'GET' && url === '/analyze') return generateMockAnalysis();
  return Promise.reject(new Error('Mock: unknown endpoint'));
}

function generateMockAnalysis() {
  if (mockExpenses.length === 0) {
    return Promise.resolve({
      topCategory: "-",
      riskLevel: "-",
      suggestion: "Add expenses to get insights"
    });
  }

  const catTotals = {};
  mockExpenses.forEach(e => {
    catTotals[e.category || "Other"] =
      (catTotals[e.category || "Other"] || 0) + e.amount;
  });

  const top = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])[0];

  const topCategory = top
    ? `${top[0]} (₹${top[1].toFixed(2)})`
    : "-";

  const total = mockExpenses.reduce((s, e) => s + e.amount, 0);

  let risk = "-";
  let sugg = "-";

  if (mockBudget > 0) {
    const usage = (total / mockBudget) * 100;

    if (usage < 50) {
      risk = "Low Risk";
      sugg = "Great! You are managing your student budget well.";
    }
    else if (usage < 80) {
      risk = "Medium Risk";
      sugg = "Try reducing small daily expenses like snacks or coffee.";
    }
    else if (usage < 100) {
      risk = "High Risk";
      sugg = "You are close to exceeding your budget.";
    }
    else {
      risk = "Overspent";
      sugg = "You exceeded your budget. Cut non-essential spending.";
    }
  } else {
    sugg = "Set a budget to get risk analysis.";
  }

  return Promise.resolve({
    topCategory,
    riskLevel: risk,
    suggestion: sugg
  });
}

// ========== Budget Functions ==========
function updateBudgetBreakdown() {
  if (!elements.aiMonthly) return;

  const monthly = monthlyBudget || mockBudget || 0;
  const weekly = monthly / 4.33;
  const daily = monthly / 30;

  elements.aiMonthly.innerText = `₹${monthly.toFixed(2)}`;
  elements.aiWeekly.innerText  = `₹${weekly.toFixed(2)}`;
  elements.aiDaily.innerText   = `₹${daily.toFixed(2)}`;
}

function updateBudgetValue(val) {
  const numericVal = Number(val);
  monthlyBudget = numericVal;

  // Update text labels
  if (elements.budgetValue) elements.budgetValue.innerText = numericVal;
  if (elements.budgetInput) elements.budgetInput.value = numericVal;

  // Calculate percentage for the CSS gradient
  const min = elements.budgetInput.min || 0;
  const max = elements.budgetInput.max || 10000;
  const percent = ((numericVal - min) / (max - min)) * 100;

  // Update slider visual to match your style.css gradient
  elements.budgetInput.style.background = `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${percent}%, rgba(255, 255, 255, 0.1) ${percent}%, rgba(255, 255, 255, 0.1) 100%)`;

  // Dynamic Glow Effect on the parent card
  const card = elements.budgetInput.closest(".budget-card");
  if (card) {
    // Glow gets stronger as the budget increases
    card.style.boxShadow = `0 10px 40px rgba(56, 189, 248, ${0.1 + (percent / 200)})`;
    card.style.borderColor = percent > 80 ? 'var(--danger)' : 'var(--primary-500)';
  }

  updateBudgetBreakdown();
}

async function setBudget() {
  if (!elements.budgetInput) return;
  monthlyBudget = Number(elements.budgetInput.value);
  
  try { 
    await apiRequest('/budget', {
      method: 'POST',
      body: JSON.stringify({ budget: monthlyBudget })
    });
    
    updateBudgetBreakdown();
    showMessage('Budget saved successfully!');
    
    // === NEW: Add these lines ===
    loadExpenses();
    // ===========================
    
  } catch {}
  
  if (useMock) mockBudget = monthlyBudget;
  loadExpenses();
}

// ========== Dropdown Management ==========
function rebuildDropdown() {
  const menu = elements.dropdownMenu;
  menu.innerHTML = '';
  
  categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'option';
    div.setAttribute('data-value', cat.value);
    div.textContent = cat.label;
    menu.appendChild(div);
  });
  
  attachDropdownListeners();
}

function attachDropdownListeners() {
  elements.dropdownMenu
    .querySelectorAll(".option")
    .forEach(opt => {
      opt.onclick = () => {
        const val = opt.getAttribute("data-value");
        elements.selectedDisplay.textContent = opt.textContent;
        elements.categoryHidden.value = val;
        elements.categoryWrapper.classList.remove("open");
        elements.categoryTrigger.setAttribute("aria-expanded", "false");
      };
    });
}

function initCategoryDropdown() {
  if (!elements.categoryTrigger) return;
  
  elements.categoryTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = elements.categoryTrigger.getAttribute('aria-expanded') === 'true' ? false : true;
    elements.categoryTrigger.setAttribute('aria-expanded', expanded);
    elements.categoryWrapper.classList.toggle('open');
  });
  
  document.addEventListener('click', (e) => {
    if (!elements.categoryWrapper.contains(e.target)) {
      elements.categoryWrapper.classList.remove('open');
      elements.categoryTrigger.setAttribute('aria-expanded', 'false');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.categoryWrapper.classList.contains('open')) {
      elements.categoryWrapper.classList.remove('open');
      elements.categoryTrigger.setAttribute('aria-expanded', 'false');
    }
  });
  
  attachDropdownListeners();
}

// Add new category
function addCategory() {

  const modal = document.getElementById("categoryModal");
  const input = document.getElementById("newCategoryInput");

  modal.style.display = "flex";
  input.value = "";
  input.focus();
}
// Remove selected category
function removeCategory() {
  const selected = elements.categoryHidden.value;

  if (!selected) {
    alert('Select a category first');
    return;
  }

  const fixed = ['Food','Transport','Shopping','Education','Entertainment'];

  if (fixed.includes(selected)) {
    alert('Default categories cannot be removed');
    return;
  }

  categories = categories.filter(c => c.value !== selected);
  saveMockToStorage();

  elements.selectedDisplay.innerText = 'Select Category';
  elements.categoryHidden.value = '';

  rebuildDropdown();
}

// ========== Expenses ==========
async function addExpense() {
  const title = elements.titleInput?.value.trim();
  const category = elements.categoryHidden?.value;
  const amount = elements.amountInput?.value.trim();
  
  if (!title || !category || !amount) return showMessage('Please fill all fields');
  if (isNaN(amount) || Number(amount) <= 0) return showMessage('Amount must be positive');
  
  try {
    await apiRequest('/add', { 
      method: 'POST', 
      body: JSON.stringify({ title, category, amount: Number(amount) }) 
    });
    
    elements.titleInput.value = ''; 
    elements.amountInput.value = ''; 
    elements.categoryHidden.value = ''; 
    elements.selectedDisplay.innerText = 'Select Category';
    
    await loadExpenses(); 
    await loadSmartAnalysis(); 
  } catch (error) { 
    console.error(error); 
  }
}

async function loadExpenses() {
  try {
    const expenses = await apiRequest('');
    if (!expenses) return;
    
    const list = elements.expenseList; 
    list.innerHTML = '';
    let total = 0;
    
    expenses.forEach(exp => {
      total += Number(exp.amount);
      const li = document.createElement('li');
      li.innerHTML = `<span><strong>${exp.title}</strong> (${exp.category || 'Other'}) - ₹${Number(exp.amount).toFixed(2)}</span>
                      <button class="delete-btn" data-id="${exp._id}">✖ Delete</button>`;
      list.appendChild(li);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => 
      btn.addEventListener('click', (e) => deleteExpense(e.target.dataset.id))
    );
    
    if (elements.totalAmount) elements.totalAmount.innerText = total.toFixed(2);
    
    const currentBudget = useMock ? mockBudget : monthlyBudget;
    if (currentBudget > 0) {
      const remaining = currentBudget - total;
      if (elements.remainingAmount) elements.remainingAmount.innerText = remaining.toFixed(2);
      const percent = total / currentBudget * 100;
      if (elements.budgetUsage) elements.budgetUsage.innerText = percent.toFixed(1) + '% Used';
    } else { 
      if (elements.remainingAmount) elements.remainingAmount.innerText = '0'; 
      if (elements.budgetUsage) elements.budgetUsage.innerText = '0% Used'; 
    }
    
    updateRecentActivity(expenses);
    updatePieChart(expenses);
    updateTimelineChart(expenses);
    updateBudgetBreakdown();
    
    // === NEW: Add these two lines ===
    updateFinancialHealthScores(expenses);
    updateNoSpendTracker(expenses);
    // ================================
    
  } catch (error) { 
    console.error(error); 
  }
}

async function deleteExpense(id) {
  if (!id || !confirm('Delete this expense?')) return;
  try { 
    await apiRequest(`/${id}`, { method: 'DELETE' }); 
    await loadExpenses(); 
    await loadSmartAnalysis(); 
    
    // === NEW: Add this line ===
    updateNoSpendTracker();
    // =========================
    
  } catch (error) { 
    console.error(error); 
  }
}

function updateRecentActivity(expenses) {
  if (!elements.recentList) return;
  const recent = [...expenses].sort((a,b) => new Date(b.date||0) - new Date(a.date||0)).slice(0,5);
  elements.recentList.innerHTML = recent.length ? recent.map(e => `
    <div class="recent-item">
      <span>${e.title} (${e.category})</span>
      <span>₹${Number(e.amount).toFixed(2)}</span>
      <small>${new Date(e.date).toLocaleDateString()}</small>
    </div>`).join('') : '<p>No recent expenses</p>';
}

// ========== PIE CHART ==========
function updatePieChart(expenses) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (expenses.length === 0) {
    if (elements.chartContainer) {
      // Don't hide completely, just show empty state
      canvas.style.display = 'none';
    }
    return;
  }

  canvas.style.display = 'block';
  if (elements.chartContainer) elements.chartContainer.style.display = 'block';

  const categoriesMap = {};
  expenses.forEach(e => {
    categoriesMap[e.category] = (categoriesMap[e.category] || 0) + e.amount;
  });

  if (chartInstance) chartInstance.destroy();

  // Get colors for each category (first one will be blue)
const colors = Object.keys(categoriesMap).map(cat =>
  getCategoryColor(cat)
);

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoriesMap),
      datasets: [{
        data: Object.values(categoriesMap),
        backgroundColor: colors,
        borderColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'bottom',
          labels: {
            color: '#ffffff',
            font: { size: 12, weight: 'bold' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.9)',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0',
          borderColor: '#38bdf8',
          borderWidth: 1
        }
      }
    }
  });
}

// ========== TIMELINE BAR CHART ==========
function updateTimelineChart(expenses) {
  const canvas = document.getElementById("timelineChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (expenses.length === 0) {
    canvas.style.display = 'none';
    return;
  }

  canvas.style.display = 'block';

  // Group expenses by date
  const dateMap = {};
  expenses.forEach(e => {
    const date = new Date(e.date || Date.now()).toLocaleDateString();
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date][e.category] = (dateMap[date][e.category] || 0) + Number(e.amount);
  });

  const labels = Object.keys(dateMap).sort((a,b) => new Date(a) - new Date(b));
  
  // Get all unique categories
  const allCategories = [...new Set(expenses.map(e => e.category))];
  
  const datasets = [];

  allCategories.forEach((category, index) => {
    const data = labels.map(date => dateMap[date][category] || 0);
    
    // Get color (first category blue, others random)
    const color = getCategoryColor(category);

    datasets.push({
      label: category,
      data: data,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1,
      borderRadius: 8,
      barPercentage: 0.7,
      categoryPercentage: 0.8
    });
  });

  if (timelineChartInstance) timelineChartInstance.destroy();

  timelineChartInstance = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: "bottom",
          labels: {
            color: '#ffffff',
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.9)',
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0'
        }
      },
      scales: {
        x: { 
          stacked: true,
          ticks: { color: '#cbd5e1' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: { 
          stacked: true, 
          beginAtZero: true,
          max: monthlyBudget || mockBudget || 1000,
          ticks: { 
            color: '#cbd5e1',
            callback: function(value) {
              return '₹' + value;
            }
          },
          grid: { color: 'rgba(255,255,255,0.1)' },
          title: {
            display: true,
            text: 'Amount (₹)',
            color: '#94a3b8'
          }
        }
      }
    }
  });
}

// ========== AI Analysis ==========
async function loadSmartAnalysis() {
  try { 
    const data = await apiRequest('/analyze'); 
    if (!data) return;
    if (elements.aiTopCategory) elements.aiTopCategory.innerText = data.topCategory || '-';
    if (elements.aiRisk) elements.aiRisk.innerText = data.riskLevel || '-';
    if (elements.aiSuggestion) elements.aiSuggestion.innerText = data.suggestion || '-';
  } catch (error) { 
    console.error(error); 
  }
}

// ========== Logout ==========
function logoutUser() {
  localStorage.removeItem("token");

  // Force clear everything
  localStorage.clear();
  sessionStorage.clear();

  // Force reload without cache
  window.location.replace("login.html");
}

// ========== Event Listeners ==========
function setupEventListeners() {

  elements.addExpenseBtn?.addEventListener('click', addExpense);
  elements.saveBudgetBtn?.addEventListener('click', setBudget);
  elements.logoutBtn?.addEventListener('click', logoutUser);
  elements.addCategoryBtn?.addEventListener('click', addCategory);
  elements.removeCategoryBtn?.addEventListener('click', removeCategory);

  if (elements.budgetInput) {
    elements.budgetInput.addEventListener('input', (e) =>
      updateBudgetValue(e.target.value)
    );
  }

  [elements.titleInput, elements.amountInput].forEach(inp =>
    inp?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addExpense();
    })
  );

  // ✅ ADD THIS PART HERE
  const categoryModal = document.getElementById("categoryModal");
  const confirmAddCategory = document.getElementById("confirmAddCategory");
  const cancelAddCategory = document.getElementById("cancelAddCategory");
  const newCategoryInput = document.getElementById("newCategoryInput");

  confirmAddCategory?.addEventListener("click", () => {

    const clean = newCategoryInput.value.trim();
    if (!clean) return;

    if (categories.some(c => c.value.toLowerCase() === clean.toLowerCase())) {
      alert("Category already exists");
      return;
    }

    categories.push({
      value: clean,
      label: clean
    });

    saveMockToStorage();
    rebuildDropdown();

    categoryModal.style.display = "none";

  });

  cancelAddCategory?.addEventListener("click", () => {
    categoryModal.style.display = "none";
  });

}
async function loadBudget() {
  try {
    const data = await apiRequest('/budget');

    monthlyBudget = Number(data.budget || 0);

    if (elements.budgetInput) {
      elements.budgetInput.value = monthlyBudget;
      updateBudgetValue(monthlyBudget);
    }

  } catch (err) {
    console.error("Load budget failed");
  }
}
function initThemeSystem(){

const dropdown = document.getElementById("themeDropdown");
const btn = document.getElementById("themeBtn");
const menu = document.getElementById("themeMenu");

if(!dropdown || !btn || !menu) return;

// open menu
btn.onclick = () => {
dropdown.classList.toggle("active");
};

// select theme
menu.querySelectorAll("[data-theme]").forEach(item=>{

item.onclick = () => {

const theme = item.dataset.theme;

document.body.classList.remove(
"light-mode",
"dark-mode",
"auto-mode"
);

document.body.classList.add(theme+"-mode");

localStorage.setItem("fintrack_theme",theme);

dropdown.classList.remove("active");

};

});

// load saved theme
const savedTheme = localStorage.getItem("fintrack_theme");

if(savedTheme){
document.body.classList.remove(
"light-mode",
"dark-mode",
"auto-mode"
);

document.body.classList.add(savedTheme+"-mode");
}

}
// ========== FINANCIAL HEALTH SCORE FUNCTIONS ==========

/**
 * Calculate Savings Score (max 40 points)
 * Formula: (Savings / Income) × 100 = Savings Ratio
 * Savings Score = (Savings Ratio / 100) × 40
 */
function calculateSavingsScore(income, expenses) {
  if (income <= 0) return 0;
  
  const savings = income - expenses;
  if (savings <= 0) return 0;
  
  const savingsRatio = (savings / income) * 100;
  const score = (savingsRatio / 100) * 40;
  
  return Math.min(40, Math.round(score * 10) / 10); // Round to 1 decimal
}

/**
 * Calculate Budget Discipline Score (max 30 points)
 * If Expenses ≤ Budget: Score = 30
 * If Expenses > Budget: Score = 30 - ((Expenses - Budget) / Budget × 30)
 */
function calculateBudgetDisciplineScore(budget, expenses) {
  if (budget <= 0) return 0;
  
  if (expenses <= budget) {
    return 30;
  } else {
    const overspend = expenses - budget;
    const penalty = (overspend / budget) * 30;
    const score = 30 - penalty;
    return Math.max(0, Math.round(score * 10) / 10); // Don't go below 0
  }
}

/**
 * Calculate Consistency Score (max 30 points)
 * Compares average daily spending with recommended daily limit
 */
function calculateConsistencyScore(budget, expenses, daysInMonth = 30) {
  if (budget <= 0 || expenses <= 0) return 0;
  
  const recommendedDaily = budget / daysInMonth;
  const averageDaily = expenses / daysInMonth;
  
  // If average daily is less than or equal to recommended, good score
  if (averageDaily <= recommendedDaily) {
    // Scale: 30 points for perfect, minimum 15 for being under budget
    const ratio = averageDaily / recommendedDaily;
    return Math.round(15 + (ratio * 15) * 10) / 10;
  } else {
    // Penalize for going over daily limit
    const overRatio = (averageDaily - recommendedDaily) / recommendedDaily;
    const penalty = Math.min(15, overRatio * 30); // Max penalty 15 points
    return Math.max(0, Math.round((30 - penalty) * 10) / 10);
  }
}

/**
 * Calculate Total Financial Health Score
 */
function calculateTotalHealthScore(savingsScore, budgetScore, consistencyScore) {
  const total = savingsScore + budgetScore + consistencyScore;
  return Math.min(100, Math.round(total * 10) / 10);
}

/**
 * Update all financial health scores in the UI
 */
function updateFinancialHealthScores(expenses = []) {

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const budget = mockBudget || monthlyBudget || 0;
  const income = budget;

  const savingsScore = calculateSavingsScore(income, totalExpenses);
  const budgetScore = calculateBudgetDisciplineScore(budget, totalExpenses);
  const consistencyScore = calculateConsistencyScore(budget, totalExpenses, 30);

  const totalScore = calculateTotalHealthScore(
    savingsScore,
    budgetScore,
    consistencyScore
  );

  const savingsEl = document.getElementById('savingsScore');
  const budgetEl = document.getElementById('budgetDisciplineScore');
  const consistencyEl = document.getElementById('consistencyScore');
  const totalEl = document.getElementById('totalHealthScore');

  if (savingsEl) savingsEl.innerText = savingsScore;
  if (budgetEl) budgetEl.innerText = budgetScore;
  if (consistencyEl) consistencyEl.innerText = consistencyScore;
  if (totalEl) totalEl.innerText = totalScore;

}
// ========== NO SPEND DAYS TRACKER ==========

/**
 * Calculate no-spend days and related metrics
 */
function updateNoSpendTracker(expenses = []) {
  if (!expenses || expenses.length === 0) {
    document.getElementById('noSpendDays').innerText = '0';
    document.getElementById('safeDailySpend').innerText = '₹0';
    document.getElementById('dailyAverage').innerText = '₹0';
    document.getElementById('streakBadge').innerText = '0 day streak';
    return;
  }
  
  // Group expenses by date
  const expensesByDate = {};
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  expenses.forEach(exp => {
    const date = new Date(exp.date);
    // Only count this month's expenses
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      const dateStr = date.toDateString();
      if (!expensesByDate[dateStr]) {
        expensesByDate[dateStr] = 0;
      }
      expensesByDate[dateStr] += exp.amount;
    }
  });
  
  // Calculate days in month so far
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDay = today.getDate();
  
  // Count no-spend days (days with no expenses)
  const daysWithExpenses = Object.keys(expensesByDate).length;
  const noSpendDays = currentDay - daysWithExpenses;
  
  // Calculate daily average
  const totalExpenses = expenses
    .filter(exp => {
      const date = new Date(exp.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);
  
  const dailyAverage = daysWithExpenses > 0 ? totalExpenses / daysWithExpenses : 0;
  
  // Calculate safe daily spend for remaining days
  const budget = mockBudget || monthlyBudget || 0;
  const spentSoFar = totalExpenses;
  const remainingDays = daysInMonth - currentDay + 1;
  const safeDailySpend = remainingDays > 0 ? (budget - spentSoFar) / remainingDays : 0;
  
  // Calculate streak (consecutive no-spend days)
  let streak = 0;
  for (let i = 0; i < currentDay; i++) {
    const checkDate = new Date(currentYear, currentMonth, currentDay - i);
    const dateStr = checkDate.toDateString();
    if (!expensesByDate[dateStr]) {
      streak++;
    } else {
      break;
    }
  }
  
  // Update UI
  document.getElementById('noSpendDays').innerText = noSpendDays;
  document.getElementById('safeDailySpend').innerText = `₹${Math.max(0, safeDailySpend).toFixed(2)}`;
  document.getElementById('dailyAverage').innerText = `₹${dailyAverage.toFixed(2)}`;
  
  const streakBadge = document.getElementById('streakBadge');
  if (streak > 0) {
    streakBadge.innerText = `🔥 ${streak} day streak`;
    streakBadge.style.background = 'linear-gradient(135deg, #f59e0b, #f97316)';
  } else {
    streakBadge.innerText = '0 day streak';
    streakBadge.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
  }
}
// ========== Init ==========
async function initDashboard() {
  elements = getElements();
  initThemeSystem(); // ADD THIS
const savedTheme = localStorage.getItem("fintrack_theme") || "auto";
document.body.classList.add(savedTheme + "-mode");
  const savedColors = localStorage.getItem("finTrack_categoryColors");
  if (savedColors) {
    categoryColors = JSON.parse(savedColors);
  }
  const wasMock = localStorage.getItem(MOCK_MODE_KEY) === 'true';
  if (wasMock) { 
    setOfflineMode(true); 
    loadMockFromStorage(); 
  }
  rebuildDropdown();
  initCategoryDropdown();
  setupEventListeners();
  
  // Set initial budget value from storage if exists
  if (mockBudget > 0) {
    if (elements.budgetInput) {
      elements.budgetInput.value = mockBudget;
      updateBudgetValue(mockBudget);
    }
  } else {
    updateBudgetBreakdown();
  }
  
try {

  await loadBudget();

  setTimeout(() => {
    if (elements.budgetInput) {
      updateBudgetValue(elements.budgetInput.value || 0);
    }
  }, 50);

  await loadExpenses();
  await loadSmartAnalysis();

} catch (error) {
  console.error(error);
}

}

// ===========================
// PAGE LOAD
// ===========================

window.history.pushState(null, null, window.location.href);

window.onpopstate = function () {
  window.history.go(1);
};

document.addEventListener("DOMContentLoaded", async () => {

  requireAuth();

  await initDashboard();

  const slider = document.getElementById("budgetInput");

  if (slider) {
    requestAnimationFrame(() => {
      updateBudgetValue(slider.value || 0);
    });
  }

});
