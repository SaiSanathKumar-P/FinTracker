/**
 * FinTrack Dashboard – Professional with offline fallback, charts & recent activity
 */

const API_BASE = '/api/expenses';
const TOKEN_KEY = 'token';
const MOCK_MODE_KEY = 'finTrack_useMock';

window.history.pushState(null, null, window.location.href);
window.onpopstate = () => window.history.go(1);

let monthlyBudget = 0;
let useMock = false;
let mockExpenses = [];
let mockBudget = 0;
let chartInstance = null;

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
  apiStatus: document.getElementById('apiStatus'),
  recentList: document.getElementById('recentList'),
  resetMockBtn: document.getElementById('resetMockBtn')
};

// ========== Utilities ==========
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function requireAuth() { if (!getToken() && !useMock) window.location.href = 'login.html'; }
function showMessage(msg) { alert(msg); }

function setOfflineMode(enabled) {
  if (elements.apiStatus) elements.apiStatus.style.display = enabled ? 'inline-block' : 'none';
  useMock = enabled;
  localStorage.setItem(MOCK_MODE_KEY, enabled ? 'true' : 'false');
}

function loadMockFromStorage() {
  try {
    const stored = localStorage.getItem('finTrack_mockExpenses');
    mockExpenses = stored ? JSON.parse(stored) : [];
    const storedBudget = localStorage.getItem('finTrack_mockBudget');
    mockBudget = storedBudget ? parseFloat(storedBudget) : 0;
  } catch { mockExpenses = []; mockBudget = 0; }
}

function saveMockToStorage() {
  localStorage.setItem('finTrack_mockExpenses', JSON.stringify(mockExpenses));
  localStorage.setItem('finTrack_mockBudget', mockBudget.toString());
}

// ========== API with fallback (no redirect on 401) ==========
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
    const newExpense = { _id: 'mock_' + Date.now(), title: body.title, category: body.category, amount: body.amount, date: new Date().toISOString() };
    mockExpenses.push(newExpense); saveMockToStorage(); return Promise.resolve(newExpense);
  }
  if (method === 'DELETE' && url.startsWith('/')) {
    const id = url.substring(1); mockExpenses = mockExpenses.filter(e => e._id !== id); saveMockToStorage(); return Promise.resolve(null);
  }
  if (method === 'POST' && url === '/budget') { mockBudget = body.budget; saveMockToStorage(); return Promise.resolve({}); }
  if (method === 'GET' && url === '/analyze') return generateMockAnalysis();
  return Promise.reject(new Error('Mock: unknown endpoint'));
}

function generateMockAnalysis() {
  if (mockExpenses.length === 0) return Promise.resolve({ topCategory: '-', riskLevel: '-', suggestion: 'Add expenses to get insights' });
  const catTotals = {};
  mockExpenses.forEach(e => catTotals[e.category || 'Other'] = (catTotals[e.category || 'Other'] || 0) + e.amount);
  const top = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];
  const topCategory = top ? `${top[0]} (₹${top[1].toFixed(2)})` : '-';
  const total = mockExpenses.reduce((s,e) => s + e.amount, 0);
  let risk = '-', sugg = '-';
  if (mockBudget > 0) {
    const usage = total / mockBudget * 100;
    if (usage < 50) { risk = 'Low Risk'; sugg = 'You are spending well within budget.'; }
    else if (usage < 80) { risk = 'Medium Risk'; sugg = 'You\'ve used over half your budget.'; }
    else if (usage < 100) { risk = 'High Risk'; sugg = 'Close to exceeding budget.'; }
    else { risk = 'Overspent'; sugg = 'You have exceeded your budget.'; }
  } else sugg = 'Set a budget to get risk analysis.';
  return Promise.resolve({ topCategory, riskLevel: risk, suggestion: sugg });
}

// ========== Dropdown ==========
function initCategoryDropdown() {
  const t = elements.categoryTrigger, w = elements.categoryWrapper, opts = elements.dropdownOptions, hid = elements.categoryHidden, disp = elements.selectedDisplay;
  if (!t) return;
  t.addEventListener('click', (e) => { e.stopPropagation(); w.classList.toggle('open'); t.setAttribute('aria-expanded', w.classList.contains('open')); });
  opts.forEach(opt => {
    opt.addEventListener('click', () => {
      const val = opt.getAttribute('data-value') || opt.textContent.trim().replace(/[^a-zA-Z]/g,'');
      disp.textContent = opt.textContent.trim(); hid.value = val; w.classList.remove('open'); t.setAttribute('aria-expanded','false');
    });
  });
  document.addEventListener('click', (e) => { if (!w.contains(e.target)) { w.classList.remove('open'); t.setAttribute('aria-expanded','false'); } });
}

// ========== Budget ==========
function updateBudgetValue(val) {
  if (elements.budgetValue) elements.budgetValue.innerText = val;
  if (elements.budgetInput) elements.budgetInput.style.backgroundSize = (val / elements.budgetInput.max * 100) + '% 100%';
}
async function setBudget() {
  if (!elements.budgetInput) return;
  monthlyBudget = Number(elements.budgetInput.value);
  try { await apiRequest('/budget', { method: 'POST', body: JSON.stringify({ budget: monthlyBudget }) }); } catch {}
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
    await apiRequest('/add', { method: 'POST', body: JSON.stringify({ title, category, amount: Number(amount) }) });
    elements.titleInput.value = ''; elements.amountInput.value = ''; elements.categoryHidden.value = ''; elements.selectedDisplay.innerText = 'Select Category';
    await loadExpenses(); await loadSmartAnalysis(); updateChart();
  } catch (error) { console.error(error); }
}

async function loadExpenses() {
  try {
    const expenses = await apiRequest('');
    if (!expenses) return;
    const list = elements.expenseList; list.innerHTML = '';
    let total = 0;
    expenses.forEach(exp => {
      total += Number(exp.amount);
      const li = document.createElement('li');
      li.innerHTML = `<span><strong>${exp.title}</strong> (${exp.category || 'Other'}) - ₹${Number(exp.amount).toFixed(2)}</span>
                      <button class="delete-btn" data-id="${exp._id}">✖ Delete</button>`;
      list.appendChild(li);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteExpense(e.target.dataset.id)));
    if (elements.totalAmount) elements.totalAmount.innerText = total.toFixed(2);
    const currentBudget = useMock ? mockBudget : monthlyBudget;
    if (currentBudget > 0) {
      const remaining = currentBudget - total;
      if (elements.remainingAmount) elements.remainingAmount.innerText = remaining.toFixed(2);
      const percent = total / currentBudget * 100;
      if (elements.budgetUsage) elements.budgetUsage.innerText = percent.toFixed(1) + '% Used';
    } else { if (elements.remainingAmount) elements.remainingAmount.innerText = '0'; if (elements.budgetUsage) elements.budgetUsage.innerText = '0% Used'; }
    updateRecentActivity(expenses);
    updateChart();
  } catch (error) { console.error(error); }
}

async function deleteExpense(id) {
  if (!id || !confirm('Delete this expense?')) return;
  try { await apiRequest(`/${id}`, { method: 'DELETE' }); await loadExpenses(); await loadSmartAnalysis(); updateChart(); } catch (error) { console.error(error); }
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

// ========== Chart ==========
function updateChart() {
  const ctx = document.getElementById('categoryChart')?.getContext('2d');
  if (!ctx) return;
  const categories = {};
  (useMock ? mockExpenses : []).forEach(e => categories[e.category] = (categories[e.category] || 0) + e.amount);
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: ['#38bdf8', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

// ========== AI ==========
async function loadSmartAnalysis() {
  try { const data = await apiRequest('/analyze'); if (!data) return;
    if (elements.aiTopCategory) elements.aiTopCategory.innerText = data.topCategory || '-';
    if (elements.aiRisk) elements.aiRisk.innerText = data.riskLevel || '-';
    if (elements.aiSuggestion) elements.aiSuggestion.innerText = data.suggestion || '-';
  } catch (error) { console.error(error); }
}

// ========== Logout ==========
function logoutUser() { localStorage.removeItem(TOKEN_KEY); window.location.href = 'login.html'; }

// ========== Reset Mock Data ==========
function resetMockData() {
  if (!useMock) { alert('Only available in offline mode'); return; }
  if (confirm('Delete all mock expenses?')) { mockExpenses = []; mockBudget = 0; saveMockToStorage(); loadExpenses(); loadSmartAnalysis(); updateChart(); }
}

// ========== Event Listeners ==========
function setupEventListeners() {
  elements.addExpenseBtn?.addEventListener('click', addExpense);
  elements.saveBudgetBtn?.addEventListener('click', setBudget);
  if (elements.budgetInput) {
    elements.budgetInput.addEventListener('input', (e) => updateBudgetValue(e.target.value));
    elements.budgetInput.addEventListener('change', setBudget);
  }
  elements.logoutBtn?.addEventListener('click', logoutUser);
  elements.resetMockBtn?.addEventListener('click', resetMockData);
  [elements.titleInput, elements.amountInput].forEach(inp => inp?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addExpense(); }));
}

// ========== Init ==========
async function initDashboard() {
  const wasMock = localStorage.getItem(MOCK_MODE_KEY) === 'true';
  if (wasMock) { setOfflineMode(true); loadMockFromStorage(); }
  requireAuth();
  initCategoryDropdown();
  setupEventListeners();
  try { await loadExpenses(); await loadSmartAnalysis(); } catch (error) { console.error(error); }
}

initDashboard();
