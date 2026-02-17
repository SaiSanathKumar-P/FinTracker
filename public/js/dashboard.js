/**
 * FinTrack Dashboard – Professional with Budget Toggle & Glow Effects
 */

const API_BASE = window.location.origin + '/api/expenses';
const TOKEN_KEY = 'token';
const MOCK_MODE_KEY = 'finTrack_useMock';

window.history.pushState(null, null, window.location.href);
window.onpopstate = () => window.history.go(1);

let monthlyBudget = 0;
let useMock = false;
let mockExpenses = [];
let mockBudget = 0;
let chartInstance = null;      // pie
let timelineChartInstance = null;  // bar

// Custom categories array (predefined + user added)
let categories = [
  { value: 'Food', label: '🍔 Food' },
  { value: 'Transport', label: '🚗 Transport' },
  { value: 'Shopping', label: '🛍 Shopping' },
  { value: 'Education', label: '📚 Education' },
  { value: 'Entertainment', label: '🎬 Entertainment' }
];

const elements = {
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
  monthlySlider: document.getElementById('monthlySlider'),
  aiMonthly: document.getElementById('aiMonthly'),
aiWeekly: document.getElementById('aiWeekly'),
aiDaily: document.getElementById('aiDaily'),

};

// ========== Utilities ==========
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function requireAuth() { if (!getToken() && !useMock) window.location.href = 'login.html'; }
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
    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
    if (response.status === 401) {
      console.warn('401 received – switching to mock mode');
      setOfflineMode(true);
      loadMockFromStorage();
      return handleMockRequest(url, options);
    }
    const data = response.status !== 204 ? await response.json() : null;
    if (!response.ok) throw new Error(data?.message || `HTTP ${response.status}`);
    return data;
  } catch (error) {
    console.warn('API failed – switching to mock mode:', error);
    setOfflineMode(true);
    loadMockFromStorage();
    return handleMockRequest(url, options);
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


// ========== Budget Period Toggle ==========
function updateBudgetBreakdown() {

  if (!elements.aiMonthly) return;

  const monthly = monthlyBudget || 0;
  const weekly = monthly / 4.33;
  const daily = monthly / 30;

  elements.aiMonthly.innerText = `₹${monthly.toFixed(2)}`;
  elements.aiWeekly.innerText  = `₹${weekly.toFixed(2)}`;
  elements.aiDaily.innerText   = `₹${daily.toFixed(2)}`;
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

        elements.selectedDisplay.textContent =
          opt.textContent;

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
  const newCat = prompt('Enter new category name:');
  if (!newCat) return;

  const clean = newCat.trim();
  if (clean === '') return;

  if (categories.some(c => c.value.toLowerCase() === clean.toLowerCase())) {
    alert('Category already exists');
    return;
  }

  categories.push({ value: clean, label: clean });
  saveMockToStorage();
  rebuildDropdown();
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


// ========== Budget ==========
function updateBudgetValue(val) {

  monthlyBudget = Number(val);
  elements.budgetValue.innerText = val;

  const percent = (val / elements.budgetInput.max) * 100;
  elements.budgetInput.style.backgroundSize = percent + '% 100%';

  updateBudgetBreakdown();
}


async function setBudget() {
  if (!elements.budgetInput) return;
  monthlyBudget = Number(elements.budgetInput.value);
  
  // Save to mock storage or API
  try { 
    await apiRequest('/budget', {
  method: 'POST',
  body: JSON.stringify({ budget: monthlyBudget })
});

updateBudgetBreakdown();
showMessage('Budget saved successfully!');

  } catch {}
  
  if (useMock) mockBudget = monthlyBudget;
  loadExpenses();
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
    updateChart();
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
    updateChart();
    updateTimelineChart(expenses);
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
    updateChart(); 
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

// ========== Chart with visibility ==========
function updateChart() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Use mock data OR live list items
  let expenses = [];

  if (useMock) {
    expenses = mockExpenses;
  } else {
    document.querySelectorAll('#expenseList li').forEach(li => {
      const text = li.innerText;
      const match = text.match(/\((.*?)\).*₹([\d.]+)/);
      if (match) {
        expenses.push({
          category: match[1],
          amount: Number(match[2])
        });
      }
    });
  }
function updateTimelineChart(expenses) {

  const canvas = document.getElementById("timelineChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Group expenses by date
  const dateMap = {};

  expenses.forEach(e => {
    const date = new Date(e.date || Date.now())
      .toLocaleDateString();

    dateMap[date] = (dateMap[date] || 0) + Number(e.amount);
  });

  const labels = Object.keys(dateMap);
  const values = Object.values(dateMap);

  if (timelineChartInstance) {
    timelineChartInstance.destroy();
  }

  timelineChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Total Expense (₹)",
        data: values,
        backgroundColor: [
          "#38bdf8",
          "#f59e0b",
          "#10b981",
          "#8b5cf6",
          "#ef4444",
          "#ec4899"
        ],
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `₹ ${ctx.raw}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

}
  if (expenses.length === 0) {
    if (elements.chartContainer)
      elements.chartContainer.style.display = 'none';
    return;
  }

  if (elements.chartContainer)
    elements.chartContainer.style.display = 'block';

  const categoriesMap = {};

  expenses.forEach(e => {
    categoriesMap[e.category] =
      (categoriesMap[e.category] || 0) + e.amount;
  });

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoriesMap),
      datasets: [{
        data: Object.values(categoriesMap),
        backgroundColor: [
          '#38bdf8',
          '#f59e0b',
          '#10b981',
          '#8b5cf6',
          '#ef4444',
          '#ec4899',
          '#14b8a6'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// ========== AI ==========
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
  localStorage.removeItem(TOKEN_KEY); 
  window.location.href = 'login.html'; 
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
    // Remove the 'change' event listener so it only saves on button click
  }
  
  [elements.titleInput, elements.amountInput].forEach(inp => 
    inp?.addEventListener('keypress', (e) => { 
      if (e.key === 'Enter') addExpense(); 
    })
  );
}

// ========== Init ==========
async function initDashboard() {
  const wasMock = localStorage.getItem(MOCK_MODE_KEY) === 'true';
  if (wasMock) { 
    setOfflineMode(true); 
    loadMockFromStorage(); 
  }
  
  requireAuth();
  rebuildDropdown();
  initCategoryDropdown();
  setupEventListeners();
  
  // Set initial budget value from storage if exists
  if (mockBudget > 0) {
    if (elements.budgetInput) {
      elements.budgetInput.value = mockBudget;
      updateBudgetValue(mockBudget);
    }
  }
  
  try { 
    await loadExpenses(); 
    await loadSmartAnalysis(); 
  } catch (error) { 
    console.error(error); 
  }
}

initDashboard();








