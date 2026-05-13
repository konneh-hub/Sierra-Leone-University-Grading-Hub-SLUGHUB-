// System Admin Dashboard JavaScript

const API_BASE = '/api/system-admin/dashboard';
let currentPage = 'overview';

// Utility functions
function getAuthToken() {
  return localStorage.getItem('authToken');
}

function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

function clearAuthToken() {
  localStorage.removeItem('authToken');
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized, redirect to login
      window.location.href = '/login'; // Assuming a login page exists
    }
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function showLoading() {
  document.getElementById('content').innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading data...</div>
    </div>
  `;
}

function showError(message) {
  document.getElementById('content').innerHTML = `<div class="error">${message}</div>`;
}

function renderCards(data) {
  if (!data || Object.keys(data).length === 0) {
    return '<p>No data available</p>';
  }

  const cards = Object.entries(data).map(([key, value]) => {
    let displayValue = value;
    if (typeof value === 'object') {
      displayValue = JSON.stringify(value, null, 2);
    }
    const formattedKey = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase());
    
    return `
      <div class="card">
        <h3>${formattedKey}</h3>
        <p>${displayValue}</p>
      </div>
    `;
  }).join('');
  return `<div class="cards">${cards}</div>`;
}

function renderTable(data, columns) {
  if (!Array.isArray(data) || data.length === 0) {
    return '<p class="info">No records found</p>';
  }

  const headers = columns.map(col => `<th>${col.label}</th>`).join('');
  const rows = data.map(item => `
    <tr>
      ${columns.map(col => {
        let cellValue = item[col.key] || '-';
        // Format dates
        if (col.key.includes('date') || col.key.includes('_at') || col.key.includes('At')) {
          try {
            cellValue = new Date(cellValue).toLocaleDateString() + ' ' + new Date(cellValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            // Keep original value if date parsing fails
          }
        }
        // Format currency
        if (col.key.includes('amount') || col.key.includes('price') || col.key.includes('cost')) {
          if (typeof cellValue === 'number') {
            cellValue = '$' + cellValue.toFixed(2);
          }
        }
        return `<td>${cellValue}</td>`;
      }).join('')}
    </tr>
  `).join('');

  return `
    <div class="table-container">
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// Page renderers
async function loadOverview() {
  try {
    showLoading();
    const data = await apiRequest('/overview');
    const content = renderCards(data);
    document.getElementById('content').innerHTML = content;
  } catch (error) {
    showError(error.message);
  }
}

async function loadUniversities() {
  try {
    showLoading();
    const data = await apiRequest('/universities');
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created' },
    ];
    const summary = renderCards(data.summary);
    const table = renderTable(data.recent, columns);
    document.getElementById('content').innerHTML = summary + table;
  } catch (error) {
    showError(error.message);
  }
}

async function loadAdminAccounts() {
  try {
    showLoading();
    const data = await apiRequest('/admin-accounts');
    const columns = [
      { key: 'email', label: 'Email' },
      { key: 'username', label: 'Username' },
      { key: 'university_name', label: 'University' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created' },
    ];
    const summary = renderCards(data.summary);
    const table = renderTable(data.recent, columns);
    document.getElementById('content').innerHTML = summary + table;
  } catch (error) {
    showError(error.message);
  }
}

async function loadSubscriptions() {
  try {
    showLoading();
    const data = await apiRequest('/subscriptions');
    const columns = [
      { key: 'university_name', label: 'University' },
      { key: 'status', label: 'Status' },
      { key: 'price_per_month', label: 'Price/Month' },
      { key: 'renewal_date', label: 'Renewal Date' },
    ];
    const summary = renderCards(data.summary);
    const table = renderTable(data.recent, columns);
    document.getElementById('content').innerHTML = summary + table;
  } catch (error) {
    showError(error.message);
  }
}

async function loadBilling() {
  try {
    showLoading();
    const data = await apiRequest('/billing');
    const columns = [
      { key: 'invoice_number', label: 'Invoice' },
      { key: 'university_id', label: 'University ID' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'billing_date', label: 'Date' },
    ];
    const summary = renderCards(data.summary);
    const table = renderTable(data.recent, columns);
    document.getElementById('content').innerHTML = summary + table;
  } catch (error) {
    showError(error.message);
  }
}

async function loadAnalytics() {
  try {
    showLoading();
    const data = await apiRequest('/analytics');
    const content = renderCards(data);
    document.getElementById('content').innerHTML = content;
  } catch (error) {
    showError(error.message);
  }
}

async function loadUsers() {
  try {
    showLoading();
    const data = await apiRequest('/users');
    const content = renderCards(data.summary) + renderCards({ roleCounts: data.roleCounts });
    document.getElementById('content').innerHTML = content;
  } catch (error) {
    showError(error.message);
  }
}

async function loadLogs() {
  try {
    showLoading();
    const data = await apiRequest('/logs');
    const columns = [
      { key: 'activity_type', label: 'Type' },
      { key: 'user_id', label: 'User ID' },
      { key: 'university_id', label: 'University ID' },
      { key: 'occurred_at', label: 'Date' },
    ];
    const summary = renderCards(data.summary);
    const table = renderTable(data.recent, columns);
    document.getElementById('content').innerHTML = summary + table;
  } catch (error) {
    showError(error.message);
  }
}

async function loadSettings() {
  try {
    showLoading();
    const data = await apiRequest('/settings');
    const form = `
      <form id="settings-form">
        <div class="form-group">
          <label for="platformName">Platform Name</label>
          <input type="text" id="platformName" name="platformName" value="${data.settings.platformName || ''}">
        </div>
        <div class="form-group">
          <label for="supportEmail">Support Email</label>
          <input type="email" id="supportEmail" name="supportEmail" value="${data.settings.supportEmail || ''}">
        </div>
        <div class="form-group">
          <label for="defaultLanguage">Default Language</label>
          <input type="text" id="defaultLanguage" name="defaultLanguage" value="${data.settings.defaultLanguage || ''}">
        </div>
        <div class="form-group">
          <label for="registrationEnabled">
            <input type="checkbox" id="registrationEnabled" name="registrationEnabled" ${data.settings.registrationEnabled ? 'checked' : ''}>
            Registration Enabled
          </label>
        </div>
        <button type="submit">Update Settings</button>
      </form>
    `;
    document.getElementById('content').innerHTML = form;

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const updates = {
        platformName: formData.get('platformName'),
        supportEmail: formData.get('supportEmail'),
        defaultLanguage: formData.get('defaultLanguage'),
        registrationEnabled: formData.get('registrationEnabled') === 'on',
      };

      try {
        await apiRequest('/settings', {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        alert('Settings updated successfully');
        loadSettings();
      } catch (error) {
        showError(error.message);
      }
    });
  } catch (error) {
    showError(error.message);
  }
}

// Navigation
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.target.dataset.page;
      const url = `/system-admin/dashboard/${page}`;
      window.history.pushState({ page }, '', url);
      loadPage(page);
    });
  });

  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadPage(currentPage);
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearAuthToken();
    window.location.href = '/system-admin/login';
  });
}

function parsePageFromPath() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const dashboardIndex = segments.indexOf('dashboard');
  if (dashboardIndex >= 0) {
    const page = segments[dashboardIndex + 1];
    return page || 'overview';
  }
  return 'overview';
}

function loadPage(page) {
  currentPage = page;
  document.getElementById('page-title').textContent = page.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.querySelector(`[data-page="${page}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  switch (page) {
    case 'overview':
      loadOverview();
      break;
    case 'universities':
      loadUniversities();
      break;
    case 'admin-accounts':
      loadAdminAccounts();
      break;
    case 'subscriptions':
      loadSubscriptions();
      break;
    case 'billing':
      loadBilling();
      break;
    case 'analytics':
      loadAnalytics();
      break;
    case 'users':
      loadUsers();
      break;
    case 'logs':
      loadLogs();
      break;
    case 'settings':
      loadSettings();
      break;
    default:
      showError('Page not found');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/system-admin/login';
    return;
  }

  setupNavigation();
  const page = parsePageFromPath();
  loadPage(page);
});

window.addEventListener('popstate', (event) => {
  const page = (event.state && event.state.page) || parsePageFromPath();
  loadPage(page);
});