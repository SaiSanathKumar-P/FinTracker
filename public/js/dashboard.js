/**
 * FinTrack Dashboard JavaScript
 * Handles all dashboard functionality: expense management, budget, AI insights, and API communication.
 * Version: 2.0 (Professional & Optimized)
 * Author: FinTrack Team
 */

// ==================== CONFIGURATION & CONSTANTS ====================
const API_BASE = '/api/expenses';               // Base API endpoint (relative for production)
const TOKEN_KEY = 'token';                       // LocalStorage key for JWT

// Prevent back button after logout
window.history.pushState(null, null, window.location.href);
window.onpopstate = () => window.history.go(1);

// ==================== STATE ====================
let monthlyBudget = 0;                            // Current monthly budget (from slider or server)

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
  logoutBtn: document.getElementById('logoutBtn')
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get JWT token from localStorage
 * @returns {string|null}
 */
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated; redirect to login if not
 */
function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
  }
}

/**
 * Show error message to user (can be enhanced with toast)
 * @param {string} message
 */
function showError(message) {
  alert(message); // Replace with a nicer UI notification if desired
}

/**
 * Generic fetch wrapper with error handling and token injection
 * @param {string} url - API endpoint (relative)
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<any>} - Parsed JSON response
 */
async function apiRequest(url, options = {}) {
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

    // Handle unauthorized (token expired/invalid)
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = 'login.html';
      return null;
    }

    // Parse JSON only if content exists
    const data = response.status !== 204 ? await response.json() : null;

    if (!response.ok) {
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    showError(error.message || 'Network error. Please check your connection.');
    throw error; // Re-throw for caller to handle if needed
  }
}

// ==================== CUSTOM DROPDOWN (CATEGORY SELECTOR) ====================

/**
 * Initialize custom dropdown with keyboard accessibility
 */
function initCategoryDropdown() {
  const { categoryTrigger, categoryWrapper, dropdownOptions, categoryHidden, selectedDisplay } = elements;

  if (!categoryTrigger || !categoryWrapper) return;

  // Toggle dropdown
  categoryTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = categoryTrigger.getAttribute('aria-expanded') === 'true' ? false : true;
    categoryTrigger.setAttribute('aria-expanded', expanded);
    categoryWrapper.classList.toggle('open');
  });

  // Select option
  dropdownOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const value = opt.getAttribute('data-value') || opt.textContent.trim().replace(/[^a-zA-Z]/g, '');
      const displayText = opt.textContent.trim();
      selectedDisplay.textContent = displayText;
      categoryHidden.value = value;
      categoryWrapper.classList.remove('open');
      categoryTrigger.setAttribute('aria-expanded', 'false');
    });

    // Keyboard support
    opt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        opt.click();
      }
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!categoryWrapper.contains(e.target)) {
      categoryWrapper.classList.remove('open');
      categoryTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && categoryWrapper.classList.contains('open')) {
      categoryWrapper.classList.remove('open');
      categoryTrigger.setAttribute('aria-expanded', 'false');
    }
  });
}

// ==================== BUDGET FUNCTIONS ====================

/**
 * Update budget value display when slider moves
 * @param {number} val - Current slider value
 */
function updateBudgetValue(val) {
  if (elements.budgetValue) {
    elements.budgetValue.innerText = val;
  }
  // Update slider background (for webkit browsers)
  if (elements.budgetInput) {
    const percent = (val / elements.budgetInput.max) * 100;
    elements.budgetInput.style.backgroundSize = percent + '% 100%';
  }
}

/**
 * Save budget from slider input
 */
async function setBudget() {
  if (!elements.budgetInput) return;
  monthlyBudget = Number(elements.budgetInput.value);

  // Optionally send to server (if API supports)
  try {
    await apiRequest('/budget', {
      method: 'POST',
      body: JSON.stringify({ budget: monthlyBudget })
    });
    showError('Budget saved successfully!'); // Using showError as temp alert
  } catch (error) {
    console.warn('Budget save to server failed, using local only:', error);
  }

  // Update UI
  loadExpenses(); // This will recalc remaining based on new monthlyBudget
}

// ==================== EXPENSE FUNCTIONS ====================

/**
 * Add a new expense
 */
async function addExpense() {
  const title = elements.titleInput?.value.trim();
  const category = elements.categoryHidden?.value;
  const amount = elements.amountInput?.value.trim();

  if (!title || !category || !amount) {
    showError('Please select a category and fill all fields');
    return;
  }

  if (isNaN(amount) || Number(amount) <= 0) {
    showError('Amount must be a positive number');
    return;
  }

  try {
    const data = await apiRequest('/add', {
      method: 'POST',
      body: JSON.stringify({ title, category, amount: Number(amount) })
    });

    // Clear inputs
    elements.titleInput.value = '';
    elements.amountInput.value = '';
    elements.categoryHidden.value = '';
    if (elements.selectedDisplay) {
      elements.selectedDisplay.innerText = 'Select Category';
    }

    // Refresh lists
    await loadExpenses();
    await loadSmartAnalysis();

    showError('Expense added successfully!'); // Temporary success message
  } catch (error) {
    // Error already handled by apiRequest
    console.error('Add expense error:', error);
  }
}

/**
 * Load and display all expenses
 */
async function loadExpenses() {
  try {
    const expenses = await apiRequest(''); // GET /api/expenses
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

    // Attach delete handlers to each delete button
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (id) deleteExpense(id);
      });
    });

    // Update total display
    if (elements.totalAmount) {
      elements.totalAmount.innerText = total.toFixed(2);
    }

    // Update remaining and budget usage if budget is set
    if (monthlyBudget > 0) {
      const remaining = monthlyBudget - total;
      if (elements.remainingAmount) {
        elements.remainingAmount.innerText = remaining.toFixed(2);
      }

      const percent = (total / monthlyBudget) * 100;
      if (elements.budgetUsage) {
        elements.budgetUsage.innerText = percent.toFixed(1) + '% Used';
      }
    } else {
      // No budget set
      if (elements.remainingAmount) elements.remainingAmount.innerText = '0';
      if (elements.budgetUsage) elements.budgetUsage.innerText = '0% Used';
    }
  } catch (error) {
    console.error('Load expenses error:', error);
  }
}

/**
 * Delete an expense by ID
 * @param {string} id - Expense ID
 */
async function deleteExpense(id) {
  if (!id) return;
  if (!confirm('Are you sure you want to delete this expense?')) return;

  try {
    await apiRequest(`/${id}`, { method: 'DELETE' });
    await loadExpenses();
    await loadSmartAnalysis();
  } catch (error) {
    console.error('Delete expense error:', error);
  }
}

// ==================== AI SMART ANALYZER ====================

/**
 * Load AI analysis data and update UI
 */
async function loadSmartAnalysis() {
  try {
    const data = await apiRequest('/analyze');
    if (!data) return;

    if (elements.aiTopCategory) {
      elements.aiTopCategory.innerText = data.topCategory || '-';
    }
    if (elements.aiRisk) {
      elements.aiRisk.innerText = data.riskLevel || '-';
    }
    if (elements.aiSuggestion) {
      elements.aiSuggestion.innerText = data.suggestion || '-';
    }
  } catch (error) {
    console.error('Load analysis error:', error);
  }
}

// ==================== LOGOUT ====================

/**
 * Log out user: remove token and redirect to login
 */
function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = 'login.html';
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // Add expense button
  if (elements.addExpenseBtn) {
    elements.addExpenseBtn.addEventListener('click', addExpense);
  }

  // Save budget button
  if (elements.saveBudgetBtn) {
    elements.saveBudgetBtn.addEventListener('click', setBudget);
  }

  // Budget slider live update
  if (elements.budgetInput) {
    elements.budgetInput.addEventListener('input', (e) => updateBudgetValue(e.target.value));
    elements.budgetInput.addEventListener('change', setBudget); // Also save on release
  }

  // Logout button
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', logoutUser);
  }

  // Allow Enter to submit expense from input fields
  if (elements.titleInput) {
    elements.titleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addExpense();
    });
  }
  if (elements.amountInput) {
    elements.amountInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addExpense();
    });
  }
}

// ==================== INITIALIZATION ====================

/**
 * Initialize dashboard: check auth, load data, set up UI
 */
async function initDashboard() {
  requireAuth(); // Redirect if no token

  // Initialize custom dropdown
  initCategoryDropdown();

  // Set up event listeners
  setupEventListeners();

  // Load initial data
  try {
    await loadExpenses();
    await loadSmartAnalysis();
  } catch (error) {
    console.error('Initial data load failed:', error);
  }

  // Optionally fetch budget from server if API supports
  // For now, we rely on slider default
}

// Start the dashboard
initDashboard();
