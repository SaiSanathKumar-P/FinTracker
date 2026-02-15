/**
 * FinTrack Dashboard – Professional with offline fallback & extra features
 */

// ==================== CONFIG ====================
const API_BASE = '/api/expenses';               // change if needed
const TOKEN_KEY = 'token';
const MOCK_MODE_KEY = 'finTrack_useMock';

// Prevent back button after logout
window.history.pushState(null, null, window.location.href);
window.onpopstate = () => window.history.go(1);

// ==================== STATE ====================
let monthlyBudget = 0;
let useMock = false;
let mockExpenses = [];
let mockBudget = 0;

// ==================== DOM ELEMENTS ====================
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
  dropdownOptions: document.querySelectorAll('.option'),
  aiTopCategory: document.getElementById('aiTopCategory'),
  aiRisk: document.getElementById('aiRisk'),
  aiSuggestion: document.getElementById('aiSuggestion'),
  logoutBtn: document.getElementById('logoutBtn'),
  apiStatus: document.getElementById('apiStatus')
};

// ==================== UTILITIES ====================
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function requireAuth() {
  if (!getToken() && !useMock) {
    window.location.href = 'login.html';
  }
}

function showMessage(msg, isError = true) {
  alert(msg); // can be replaced with a toast later
}

// Show/hide offline badge and add retry button
function setOfflineMode(enabled) {
  if (elements.apiStatus) {
    elements.apiStatus.style.display = enabled ? 'inline-block' : 'none';
    if (enabled) {
      // Add a retry button if not already present
      if (!document.getElementById('retryBtn')) {
        const retry = document.createElement('button');
        retry.id = 'retryBtn';
        retry.textContent = '↻ Retry Connection';
        retry.style.marginLeft = '10px';
        retry.style.padding = '4px 10px';
        retry.style.borderRadius = '20px';
        retry.style.border = 'none';
        retry.style.background = '#3b82f6';
        retry.style.color = 'white';
        retry.style.cursor = 'pointer';
        retry.addEventListener('click', tryReconnect);
        elements.apiStatus.parentNode.appendChild(retry);
      }
    } else {
      const retry = document.getElementById('retryBtn');
      if (retry) retry.remove();
    }
  }
  useMock = enabled;
  localStorage.setItem(MOCK_MODE_KEY, enabled ? 'true' : 'false');
}

// Try to reconnect to backend
async function tryReconnect() {
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) retryBtn.disabled = true;
  useMock = false; // temporarily disable mock
  try {
    // Test a simple request (e.g., fetch expenses)
    await fetch(`${API_BASE}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    // If success, turn off offline mode and reload data
    setOfflineMode(false);
    await loadExpenses();
    await loadSmartAnalysis();
  } catch (e) {
    setOfflineMode(true); // stay in mock
    alert('Still unable to reach server. Using offline mode.');
  } finally {
    if (retryBtn) retryBtn.disabled = false;
  }
}

// ==================== MOCK DATA ====================
function loadMockFromStorage() {
  try {
    const stored = localStorage.getItem('finTrack_mockExpenses');
    mockExpenses = stored ? JSON.parse(stored) : [];
    const storedBudget = localStorage.getItem('finTrack_mockBudget');
    mockBudget = storedBudget ? parseFloat(storedBudget) : 0;
  } catch (e) {
    mockExpenses = [];
    mockBudget = 0;
  }
}

function saveMockToStorage() {
  localStorage.setItem('finTrack_mockExpenses', JSON.stringify(mockExpenses));
  localStorage.setItem('finTrack_mockBudget', mockBudget.toString());
}

// ==================== API REQUEST (silent fallback) ====================
async function apiRequest(url, options = {}) {
  if (useMock) {
    return handleMockRequest(url, options);
  }

  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = 'login.html';
      return null;
    }

    const data = response.status !== 204 ? await response.json() : null;
    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}`);
    }
    return data;
  } catch (error) {
    console.warn('API request failed, switching to mock mode:', error);
    setOfflineMode(true);
    loadMockFromStorage();
    // Silently retry as mock (no alert)
    return handleMockRequest(url, options);
  }
}

// ==================== MOCK HANDLER ====================
function handleMockRequest(url, options) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;

  if (method === 'GET' && url === '') {
    return Promise.resolve(mockExpenses);
  }
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
  if (method === 'GET' && url === '/analyze') {
    return generateMockAnalysis();
  }
  return Promise.reject(new Error('Mock: unknown endpoint'));
}

function generateMockAnalysis() {
  if (mockExpenses.length === 0) {
    return Promise.resolve({
      topCategory: '-',
      riskLevel: '-',
      suggestion: 'Add some expenses to get insights'
    });
  }
  const categoryTotals = {};
  mockExpenses.forEach(e => {
    const cat = e.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });
  const topCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const topCategory = topCat ? `${topCat[0]} (₹${topCat[1].toFixed(2)})` : '-';

  const total = mockExpenses.reduce((s, e) => s + e.amount, 0);
  let riskLevel = '-';
  let suggestion = '-';
  if (mockBudget > 0) {
    const usage = (total / mockBudget) * 100;
    if (usage < 50) {
      riskLevel = 'Low Risk';
      suggestion = 'You are spending well within budget. Great job!';
    } else if (usage < 80) {
      riskLevel = 'Medium Risk';
      suggestion = 'You\'ve used over half your budget. Keep an eye on spending.';
    } else if (usage < 100) {
      riskLevel = 'High Risk';
      suggestion = 'You are close to exceeding your budget. Consider reducing expenses.';
    } else {
      riskLevel = 'Overspent';
      suggestion = 'You have exceeded your budget. Review your expenses and adjust.';
    }
  } else {
    suggestion = 'Set a budget to get risk analysis.';
  }
  return Promise.resolve({ topCategory, riskLevel, suggestion });
}

// ==================== DROPDOWN ====================
function initCategoryDropdown() {
  const { categoryTrigger, categoryWrapper, dropdownOptions, categoryHidden, selectedDisplay } = elements;
  if (!categoryTrigger) return;
  categoryTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = categoryTrigger.getAttribute('aria-expanded') === 'true' ? false : true;
    categoryTrigger.setAttribute('aria-expanded', expanded);
    categoryWrapper.classList.toggle('open');
  });
  dropdownOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const value = opt.getAttribute('data-value') || opt.textContent.trim().replace(/[^a-zA-Z]/g, '');
      const displayText = opt.textContent.trim();
      selectedDisplay.textContent = displayText;
      categoryHidden.value = value;
      categoryWrapper.classList.remove('open');
      categoryTrigger.setAttribute('aria-expanded', 'false');
    });
    opt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        opt.click();
      }
    });
  });
  document.addEventListener('click', (e) => {
    if (!categoryWrapper.contains(e.target)) {
      categoryWrapper.classList.remove('open');
      categoryTrigger.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && categoryWrapper.classList.contains('open')) {
      categoryWrapper.classList.remove('open');
      categoryTrigger.setAttribute('aria-expanded', 'false');
    }
  });
}

// ==================== BUDGET ====================
function updateBudgetValue(val) {
  if (elements.budgetValue) elements.budgetValue.innerText = val;
  if (elements.budgetInput) {
    const percent = (val / elements.budgetInput.max) * 100;
    elements.budgetInput.style.backgroundSize = percent + '% 100%';
  }
}

async function setBudget() {
  if (!elements.budgetInput) return;
  monthlyBudget = Number(elements.budgetInput.value);
  try {
    await apiRequest('/budget', { method: 'POST', body: JSON.stringify({ budget: monthlyBudget }) });
  } catch (error) {
    console.warn('Budget save failed:', error);
  }
  if (useMock) mockBudget = monthlyBudget;
  loadExpenses();
}

// ==================== EXPENSES ====================
async function addExpense() {
  const title = elements.titleInput?.value.trim();
  const category = elements.categoryHidden?.value;
  const amount = elements.amountInput?.value.trim();

  if (!title || !category || !amount) {
    showMessage('Please select a category and fill all fields');
    return;
  }
  if (isNaN(amount) || Number(amount) <= 0) {
    showMessage('Amount must be a positive number');
    return;
  }

  try {
    await apiRequest('/add', {
      method: 'POST',
      body: JSON.stringify({ title, category, amount: Number(amount) })
    });
    elements.titleInput.value = '';
    elements.amountInput.value = '';
    elements.categoryHidden.value = '';
    if (elements.selectedDisplay) elements.selectedDisplay.innerText = 'Select Category';
    await loadExpenses();
    await loadSmartAnalysis();
  } catch (error) {
    console.error('Add expense error:', error);
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
      li.innerHTML = `
        <span><strong>${exp.title}</strong> (${exp.category || 'Other'}) - ₹${Number(exp.amount).toFixed(2)}</span>
        <button class="delete-btn" data-id="${exp._id}" aria-label="Delete expense">✖ Delete</button>
      `;
      list.appendChild(li);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (id) deleteExpense(id);
      });
    });
    if (elements.totalAmount) elements.totalAmount.innerText = total.toFixed(2);

    const currentBudget = useMock ? mockBudget : monthlyBudget;
    if (currentBudget > 0) {
      const remaining = currentBudget - total;
      if (elements.remainingAmount) elements.remainingAmount.innerText = remaining.toFixed(2);
      const percent = (total / currentBudget) * 100;
      if (elements.budgetUsage) elements.budgetUsage.innerText = percent.toFixed(1) + '% Used';
    } else {
      if (elements.remainingAmount) elements.remainingAmount.innerText = '0';
      if (elements.budgetUsage) elements.budgetUsage.innerText = '0% Used';
    }
  } catch (error) {
    console.error('Load expenses error:', error);
  }
}

async function deleteExpense(id) {
  if (!id) return;
  if (!confirm('Delete this expense?')) return;
  try {
    await apiRequest(`/${id}`, { method: 'DELETE' });
    await loadExpenses();
    await loadSmartAnalysis();
  } catch (error) {
    console.error('Delete error:', error);
  }
}

// ==================== CLEAR ALL (new feature) ====================
function clearAllExpenses() {
  if (!confirm('Delete ALL expenses? This cannot be undone.')) return;
  if (useMock) {
    mockExpenses = [];
    saveMockToStorage();
    loadExpenses();
    loadSmartAnalysis();
  } else {
    // For real backend, you'd need a bulk delete endpoint; here we just inform.
    alert('Clear all is only available in offline mode.');
  }
}

// ==================== AI ANALYZER ====================
async function loadSmartAnalysis() {
  try {
    const data = await apiRequest('/analyze');
    if (!data) return;
    if (elements.aiTopCategory) elements.aiTopCategory.innerText = data.topCategory || '-';
    if (elements.aiRisk) elements.aiRisk.innerText = data.riskLevel || '-';
    if (elements.aiSuggestion) elements.aiSuggestion.innerText = data.suggestion || '-';
  } catch (error) {
    console.error('Analysis error:', error);
  }
}

// ==================== LOGOUT ====================
function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = 'login.html';
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  if (elements.addExpenseBtn) elements.addExpenseBtn.addEventListener('click', addExpense);
  if (elements.saveBudgetBtn) elements.saveBudgetBtn.addEventListener('click', setBudget);
  if (elements.budgetInput) {
    elements.budgetInput.addEventListener('input', (e) => updateBudgetValue(e.target.value));
    elements.budgetInput.addEventListener('change', setBudget);
  }
  if (elements.logoutBtn) elements.logoutBtn.addEventListener('click', logoutUser);
  if (elements.titleInput) {
    elements.titleInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addExpense(); });
  }
  if (elements.amountInput) {
    elements.amountInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addExpense(); });
  }
  // Add a clear all button in the expense list section
  const historyHeading = document.getElementById('history-heading');
  if (historyHeading && !document.getElementById('clearAllBtn')) {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clearAllBtn';
    clearBtn.textContent = 'Clear All';
    clearBtn.style.marginLeft = '1rem';
    clearBtn.style.padding = '4px 12px';
    clearBtn.style.background = '#ef4444';
    clearBtn.style.color = 'white';
    clearBtn.style.border = 'none';
    clearBtn.style.borderRadius = '20px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.addEventListener('click', clearAllExpenses);
    historyHeading.appendChild(clearBtn);
  }
}

// ==================== INIT ====================
async function initDashboard() {
  const wasMock = localStorage.getItem(MOCK_MODE_KEY) === 'true';
  if (wasMock) {
    setOfflineMode(true);
    loadMockFromStorage();
  }
  requireAuth();
  initCategoryDropdown();
  setupEventListeners();
  try {
    await loadExpenses();
    await loadSmartAnalysis();
  } catch (error) {
    console.error('Initial load failed:', error);
  }
}

initDashboard();
