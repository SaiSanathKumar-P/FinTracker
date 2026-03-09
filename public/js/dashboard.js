/**
 * FinTrack Dashboard – Professional with Budget Toggle & Glow Effects
 */

const API_BASE = '/api/expenses';
const TOKEN_KEY = 'token';
let monthlyBudget = 0;
let chartInstance = null;      // pie chart
let timelineChartInstance = null;  // bar chart
let elements; // Declare elements globally

// Custom categories array (predefined + user added)
let categories = [
  { value: 'Food', label: '🍔 Food' },
  { value: 'Transport', label: '🚗 Transport' },
  { value: 'Shopping', label: '🛍 Shopping' },
  { value: 'Education', label: '📚 Education' },
  { value: 'Entertainment', label: '🎬 Entertainment' }
];

// ================= COLOR REGISTRY =================
let categoryColors = {};

function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 80%, 65%)`;
}

function getCategoryColor(category) {
  if (!categoryColors[category]) {
    if (Object.keys(categoryColors).length === 0) {
      categoryColors[category] = '#38bdf8';
    } else {
      let color;
      do {
        color = getRandomColor();
      } while (color === '#38bdf8');
      categoryColors[category] = color;
    }
    localStorage.setItem("finTrack_categoryColors", JSON.stringify(categoryColors));
  }
  return categoryColors[category];
}

// Get DOM elements
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
    savingsScore: document.getElementById('savingsScore'),
    budgetDisciplineScore: document.getElementById('budgetDisciplineScore'),
    consistencyScore: document.getElementById('consistencyScore'),
    totalHealthScore: document.getElementById('totalHealthScore'),
    noSpendDays: document.getElementById('noSpendDays'),
    safeDailySpend: document.getElementById('safeDailySpend'),
    dailyAverage: document.getElementById('dailyAverage'),
    streakBadge: document.getElementById('streakBadge')
  };
}

// Handle token from URL
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

// ========== API with fallback ==========
async function apiRequest(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.replace("login.html");
      return;
    }
    const data = response.status !== 204 ? await response.json() : null;
    if (!response.ok) throw new Error(data?.message || `HTTP ${response.status}`);
    return data;
  } catch (error) {
    console.error("API ERROR:", error);
    throw error;
  }
}

// ========== Budget Functions ==========
function updateBudgetBreakdown() {
  if (!elements.aiMonthly) return;
  const monthly = monthlyBudget || 0;
  const weekly = monthly / 4.33;
  const daily = monthly / 30;
  elements.aiMonthly.innerText = `₹${monthly.toFixed(2)}`;
  elements.aiWeekly.innerText  = `₹${weekly.toFixed(2)}`;
  elements.aiDaily.innerText   = `₹${daily.toFixed(2)}`;
}

function updateBudgetValue(val) {
  const num = Number(val);
  const max = elements.budgetInput.max || 20000;
  const percent = (num / max) * 100;
  const progress = document.getElementById("budgetProgress");
  if (progress) progress.style.width = percent + "%";

  elements.budgetValue.innerText = num.toLocaleString();
  
  const badge = document.getElementById('budgetPercentBadge');
  if (badge) badge.innerText = `${Math.round(percent)}%`;
  
  const card = elements.budgetInput.closest(".budget-card");
  if (card) {
    card.style.boxShadow = `0 10px 50px rgba(56, 189, 248, ${0.1 + (percent/250)})`;
    card.style.borderColor = percent > 90 ? '#ef4444' : 'rgba(56, 189, 248, 0.4)';
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
    await loadExpenses();
  } catch (error) {
    console.error(error);
  }
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
  elements.dropdownMenu.querySelectorAll(".option").forEach(opt => {
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

// Category management
function addCategory() {
  const modal = document.getElementById("categoryModal");
  const input = document.getElementById("newCategoryInput");
  modal.style.display = "flex";
  input.value = "";
  input.focus();
}

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
    
    // ✅ FIXED: Moved outside the loop
    if (elements.totalAmount) elements.totalAmount.innerText = total.toFixed(2);
    
    // ✅ ADD THIS LINE TO SAVE TOTAL FOR PROFILE PAGE
    localStorage.setItem('finTrack_totalAmount', total.toFixed(2));
    
    const currentBudget = monthlyBudget;
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
    updateFinancialHealthScores(expenses);
    updateNoSpendTracker(expenses);
    
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
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = 'block';
  if (elements.chartContainer) elements.chartContainer.style.display = 'block';
  const categoriesMap = {};
  expenses.forEach(e => { categoriesMap[e.category] = (categoriesMap[e.category] || 0) + e.amount; });
  if (chartInstance) chartInstance.destroy();
  const colors = Object.keys(categoriesMap).map(cat => getCategoryColor(cat));
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
          labels: { color: '#ffffff', font: { size: 12, weight: 'bold' } }
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
  const dateMap = {};
  expenses.forEach(e => {
    const date = new Date(e.date || Date.now()).toLocaleDateString();
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date][e.category] = (dateMap[date][e.category] || 0) + Number(e.amount);
  });
  const labels = Object.keys(dateMap).sort((a,b) => new Date(a) - new Date(b));
  const allCategories = [...new Set(expenses.map(e => e.category))];
  const datasets = [];
  allCategories.forEach(category => {
    const data = labels.map(date => dateMap[date][category] || 0);
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
        legend: { position: "bottom", labels: { color: '#ffffff', font: { size: 11 } } }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { 
          stacked: true, beginAtZero: true,
          max: Math.max(monthlyBudget, ...expenses.map(e => Number(e.amount))) || 1000,
          ticks: { color: '#cbd5e1', callback: function(value) { return '₹' + value; } },
          grid: { color: 'rgba(255,255,255,0.1)' }
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

// ========== FINANCIAL HEALTH SCORES ==========
function calculateSavingsScore(income, expenses) {
  if (income <= 0) return 0;
  const savings = income - expenses;
  if (savings <= 0) return 0;
  const savingsRatio = (savings / income) * 100;
  const score = (savingsRatio / 100) * 40;
  return Math.min(40, Math.round(score * 10) / 10);
}

function calculateBudgetDisciplineScore(budget, expenses) {
  if (budget <= 0) return 0;
  if (expenses <= budget) return 30;
  const overspend = expenses - budget;
  const penalty = (overspend / budget) * 30;
  const score = 30 - penalty;
  return Math.max(0, Math.round(score * 10) / 10);
}

function calculateConsistencyScore(budget, expenses, daysInMonth = 30) {
  if (budget <= 0) return 0;
  const recommendedDaily = budget / daysInMonth;
  const averageDaily = expenses / daysInMonth;
  if (averageDaily <= recommendedDaily) {
    const ratio = averageDaily / recommendedDaily;
    return Math.min(30, Math.round((15 + ratio * 15) * 10) / 10);
  } else {
    const overRatio = (averageDaily - recommendedDaily) / recommendedDaily;
    const penalty = Math.min(15, overRatio * 30);
    return Math.max(0, Math.round((30 - penalty) * 10) / 10);
  }
}

function calculateTotalHealthScore(savingsScore, budgetScore, consistencyScore) {
  const total = savingsScore + budgetScore + consistencyScore;
  return Math.min(100, Math.round(total * 10) / 10);
}

function updateFinancialHealthScores(expenses = []) {
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const budget = monthlyBudget || 0;
  const income = budget;
  const savingsScore = calculateSavingsScore(income, totalExpenses);
  const budgetScore = calculateBudgetDisciplineScore(budget, totalExpenses);
  const consistencyScore = calculateConsistencyScore(budget, totalExpenses, 30);
  const totalScore = calculateTotalHealthScore(savingsScore, budgetScore, consistencyScore);
  
  if (elements.savingsScore) elements.savingsScore.innerText = savingsScore;
  if (elements.budgetDisciplineScore) elements.budgetDisciplineScore.innerText = budgetScore;
  if (elements.consistencyScore) elements.consistencyScore.innerText = consistencyScore;
  if (elements.totalHealthScore) elements.totalHealthScore.innerText = totalScore;
}

// ========== NO SPEND TRACKER ==========
function updateNoSpendTracker(expenses = []) {
  if (!elements.noSpendDays) return;
  if (!expenses || expenses.length === 0) {
    elements.noSpendDays.innerText = '0';
    if (elements.safeDailySpend) elements.safeDailySpend.innerText = '₹0';
    if (elements.dailyAverage) elements.dailyAverage.innerText = '₹0';
    if (elements.streakBadge) elements.streakBadge.innerText = '0 day streak';
    return;
  }
  
  const expensesByDate = {};
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  expenses.forEach(exp => {
    const date = new Date(exp.date);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      const dateStr = date.toDateString();
      expensesByDate[dateStr] = (expensesByDate[dateStr] || 0) + Number(exp.amount);
    }
  });
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDay = today.getDate();
  const daysWithExpenses = Object.keys(expensesByDate).length;
  const noSpendDays = Math.max(0, currentDay - daysWithExpenses);
  
  const totalExpenses = expenses
    .filter(exp => {
      const date = new Date(exp.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, exp) => sum + Number(exp.amount), 0);
  
  const dailyAverage = daysWithExpenses > 0 ? totalExpenses / daysWithExpenses : 0;
  const budget = monthlyBudget || 0;
  const spentSoFar = totalExpenses;
  const remainingDays = daysInMonth - currentDay + 1;
  const safeDailySpend = remainingDays > 0 ? Math.max(0, (budget - spentSoFar) / remainingDays) : 0;
  
  let streak = 0;
  for (let i = 0; i < currentDay; i++) {
    const checkDate = new Date(currentYear, currentMonth, currentDay - i);
    const dateStr = checkDate.toDateString();
    if (!expensesByDate[dateStr]) streak++;
    else break;
  }
  
  if (elements.noSpendDays) elements.noSpendDays.innerText = noSpendDays;
  if (elements.safeDailySpend) elements.safeDailySpend.innerText = `₹${safeDailySpend.toFixed(2)}`;
  if (elements.dailyAverage) elements.dailyAverage.innerText = `₹${dailyAverage.toFixed(2)}`;
  
  if (elements.streakBadge) {
    if (streak > 0) {
      elements.streakBadge.innerText = `🔥 ${streak} day streak`;
      elements.streakBadge.style.background = 'linear-gradient(135deg, #f59e0b, #f97316)';
    } else {
      elements.streakBadge.innerText = '0 day streak';
      elements.streakBadge.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
    }
  }
}

// ========== Logout ==========
// ========== Logout ==========
function logoutUser() {
  // ✅ Only remove the token, keep user data
  localStorage.removeItem("token");
  // Also remove any session data if needed
  sessionStorage.clear();
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
    elements.budgetInput.addEventListener('input', (e) => updateBudgetValue(e.target.value));
  }
  
  [elements.titleInput, elements.amountInput].forEach(inp =>
    inp?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addExpense(); })
  );

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
    categories.push({ value: clean, label: clean });
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

function initThemeSystem() {
  const themeBtn = document.getElementById("themeBtn");
  const themeMenu = document.getElementById("themeMenu");
  const dropdown = document.getElementById("themeDropdown");
  const themeLabel = document.getElementById("themeLabel");
  const themeIcon = document.querySelector(".theme-icon");

  if (!themeBtn || !themeMenu) return;

  function applyTheme(theme) {
    document.body.classList.remove("light-mode", "dark-mode", "auto-mode");
    document.body.classList.add(theme + "-mode");
    if (themeLabel) themeLabel.innerText = theme.charAt(0).toUpperCase() + theme.slice(1);
    if (themeIcon) {
      const icons = { light: '☀️', dark: '🌙', auto: '🌓' };
      themeIcon.textContent = icons[theme] || '🌓';
    }
    localStorage.setItem("theme", theme);
  }

  const savedTheme = localStorage.getItem("theme") || "auto";
  applyTheme(savedTheme);

  themeBtn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("active");
  };

  themeMenu.querySelectorAll("[data-theme]").forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      applyTheme(item.dataset.theme);
      dropdown.classList.remove("active");
    };
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".theme-dropdown")) {
      dropdown.classList.remove("active");
    }
  });
}

// ========== Init ==========
async function initDashboard() {
  elements = getElements();
  initThemeSystem();
  
  const savedColors = localStorage.getItem("finTrack_categoryColors");
  if (savedColors) categoryColors = JSON.parse(savedColors);
  
  rebuildDropdown();
  initCategoryDropdown();
  setupEventListeners();
  updateBudgetBreakdown();
  
  try {
    await loadBudget();
    setTimeout(() => {
      if (elements.budgetInput) updateBudgetValue(elements.budgetInput.value || 0);
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
window.onpopstate = function () { window.history.go(1); };

document.addEventListener("DOMContentLoaded", async () => {
  requireAuth();
  await initDashboard();
  const slider = document.getElementById("budgetInput");
  if (slider) {
    requestAnimationFrame(() => { updateBudgetValue(slider.value || 0); });
  }
});
