// Page renderers for System Admin Dashboard

const pageRenderers = {
  // Overview Page
  renderOverviewPage: function(data) {
    return `
      <div class="page-content overview-page">
        <div class="page-header">
          <h2>Platform Overview</h2>
          <p>High-level overview of your system</p>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">📊</div>
            <div class="metric-data">
              <h4>Total Universities</h4>
              <p class="metric-value">${data.totalUniversities || 0}</p>
              <span class="metric-change">Active platforms</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">👥</div>
            <div class="metric-data">
              <h4>Total Users</h4>
              <p class="metric-value">${data.totalUsers || 0}</p>
              <span class="metric-change">Across all universities</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">💰</div>
            <div class="metric-data">
              <h4>Monthly Revenue</h4>
              <p class="metric-value">$${(data.monthlyRevenue || 0).toLocaleString()}</p>
              <span class="metric-change">Current month</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">📈</div>
            <div class="metric-data">
              <h4>Active Subscriptions</h4>
              <p class="metric-value">${data.activeSubscriptions || 0}</p>
              <span class="metric-change">Current status</span>
            </div>
          </div>
        </div>

        <div class="overview-sections">
          <div class="section">
            <h3>System Health</h3>
            <div class="health-indicator">
              <div class="health-item">
                <span class="health-label">Database Status</span>
                <span class="health-status online">● Online</span>
              </div>
              <div class="health-item">
                <span class="health-label">API Gateway</span>
                <span class="health-status online">● Online</span>
              </div>
              <div class="health-item">
                <span class="health-label">Job Queue</span>
                <span class="health-status online">● Online</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Recent Activity</h3>
            <p class="section-description">Latest system events</p>
            ${data.recentLogs && data.recentLogs.length > 0 ? `
              <div class="activity-list">
                ${data.recentLogs.slice(0, 5).map((log, index) => `
                  <div class="activity-item">
                    <div class="activity-time">${new Date(log.occurred_at).toLocaleString()}</div>
                    <div class="activity-type">${log.activity_type}</div>
                    <div class="activity-description">${log.description || 'System action'}</div>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="no-data">No recent activity</p>'}
          </div>
        </div>
      </div>
    `;
  },

  // Universities Page
  renderUniversitiesPage: function(data) {
    return `
      <div class="page-content universities-page">
        <div class="page-header">
          <h2>Universities</h2>
          <p>Manage all registered universities</p>
          <button class="btn-primary">+ Add University</button>
        </div>

        ${data.summary ? `
          <div class="summary-cards">
            <div class="summary-card">
              <h4>${data.summary.total || 0}</h4>
              <p>Total Universities</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.active || 0}</h4>
              <p>Active</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.inactive || 0}</h4>
              <p>Inactive</p>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <h3>Universities List</h3>
          ${this.renderDataTable(data.recent, [
            { key: 'name', label: 'University Name' },
            { key: 'code', label: 'Code' },
            { key: 'city', label: 'City' },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'Created' },
            { key: 'actions', label: 'Actions' }
          ])}
        </div>
      </div>
    `;
  },

  // Admin Accounts Page
  renderAdminAccountsPage: function(data) {
    return `
      <div class="page-content admin-accounts-page">
        <div class="page-header">
          <h2>Admin Accounts</h2>
          <p>Manage system and university administrators</p>
          <button class="btn-primary">+ Create Admin</button>
        </div>

        ${data.summary ? `
          <div class="summary-cards">
            <div class="summary-card">
              <h4>${data.summary.total || 0}</h4>
              <p>Total Admins</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.active || 0}</h4>
              <p>Active</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.inactive || 0}</h4>
              <p>Inactive</p>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <h3>Admin List</h3>
          ${this.renderDataTable(data.recent, [
            { key: 'email', label: 'Email' },
            { key: 'username', label: 'Username' },
            { key: 'university_name', label: 'University' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions' }
          ])}
        </div>
      </div>
    `;
  },

  // Subscriptions Page
  renderSubscriptionsPage: function(data) {
    return `
      <div class="page-content subscriptions-page">
        <div class="page-header">
          <h2>Subscriptions</h2>
          <p>Monitor and manage university subscriptions</p>
        </div>

        ${data.summary ? `
          <div class="summary-cards">
            <div class="summary-card">
              <h4>${data.summary.total || 0}</h4>
              <p>Total Subscriptions</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.active || 0}</h4>
              <p>Active</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.expiring_soon || 0}</h4>
              <p>Expiring Soon</p>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <h3>Subscription Plans</h3>
          ${this.renderDataTable(data.recent, [
            { key: 'university_name', label: 'University' },
            { key: 'plan_name', label: 'Plan' },
            { key: 'status', label: 'Status' },
            { key: 'price_per_month', label: 'Price/Month' },
            { key: 'start_date', label: 'Start Date' },
            { key: 'renewal_date', label: 'Renewal Date' }
          ])}
        </div>
      </div>
    `;
  },

  // Billing Page
  renderBillingPage: function(data) {
    return `
      <div class="page-content billing-page">
        <div class="page-header">
          <h2>Billing</h2>
          <p>Invoice and payment management</p>
        </div>

        ${data.summary ? `
          <div class="summary-cards">
            <div class="summary-card">
              <h4>$${(data.summary.total_revenue || 0).toLocaleString()}</h4>
              <p>Total Revenue</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.pending_invoices || 0}</h4>
              <p>Pending Invoices</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.paid_invoices || 0}</h4>
              <p>Paid</p>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <h3>Recent Invoices</h3>
          ${this.renderDataTable(data.recent, [
            { key: 'invoice_number', label: 'Invoice #' },
            { key: 'university_name', label: 'University' },
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' },
            { key: 'billing_date', label: 'Date' },
            { key: 'actions', label: 'Actions' }
          ])}
        </div>
      </div>
    `;
  },

  // Analytics Page
  renderAnalyticsPage: function(data) {
    return `
      <div class="page-content analytics-page">
        <div class="page-header">
          <h2>Analytics</h2>
          <p>Platform statistics and insights</p>
        </div>

        <div class="analytics-filters">
          <select id="dateRange" class="filter-select">
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">📊</div>
            <div class="metric-data">
              <h4>User Growth</h4>
              <p class="metric-value">${data.userGrowth || '+0%'}</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">💾</div>
            <div class="metric-data">
              <h4>Data Storage</h4>
              <p class="metric-value">${data.dataStorage || '0 GB'}</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">⏱️</div>
            <div class="metric-data">
              <h4>Avg Response Time</h4>
              <p class="metric-value">${data.avgResponseTime || '0ms'}</p>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">✅</div>
            <div class="metric-data">
              <h4>Uptime</h4>
              <p class="metric-value">${data.uptime || '99.9%'}</p>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Charts will be rendered here</h3>
          <p class="section-description">Analytics data visualization</p>
        </div>
      </div>
    `;
  },

  // Users Page
  renderUsersPage: function(data) {
    return `
      <div class="page-content users-page">
        <div class="page-header">
          <h2>Users</h2>
          <p>All platform users across universities</p>
        </div>

        ${data.summary ? `
          <div class="summary-cards">
            <div class="summary-card">
              <h4>${data.summary.total_users || 0}</h4>
              <p>Total Users</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.students || 0}</h4>
              <p>Students</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.faculty || 0}</h4>
              <p>Faculty</p>
            </div>
            <div class="summary-card">
              <h4>${data.summary.admins || 0}</h4>
              <p>Admins</p>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <h3>User Distribution by Role</h3>
          ${data.roleCounts ? `
            <div class="role-distribution">
              ${Object.entries(data.roleCounts).map(([role, count]) => `
                <div class="role-item">
                  <span class="role-name">${role}</span>
                  <div class="role-bar">
                    <div class="role-fill" style="width: ${(count / Math.max(...Object.values(data.roleCounts))) * 100}%"></div>
                  </div>
                  <span class="role-count">${count}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="no-data">No data available</p>'}
        </div>
      </div>
    `;
  },

  // Logs Page
  renderLogsPage: function(data) {
    return `
      <div class="page-content logs-page">
        <div class="page-header">
          <h2>Activity Logs</h2>
          <p>System activity and audit trail</p>
        </div>

        <div class="log-filters">
          <input type="text" placeholder="Search logs..." id="logSearch" class="filter-input">
          <select id="activityType" class="filter-select">
            <option value="">All Types</option>
            <option value="LOGIN">Login</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
        </div>

        <div class="section">
          <h3>Recent Activity</h3>
          ${this.renderDataTable(data.recent, [
            { key: 'activity_type', label: 'Type' },
            { key: 'user_email', label: 'User' },
            { key: 'university_id', label: 'University' },
            { key: 'description', label: 'Description' },
            { key: 'occurred_at', label: 'Date/Time' }
          ])}
        </div>
      </div>
    `;
  },

  // Settings Page
  renderSettingsPage: function(data) {
    return `
      <div class="page-content settings-page">
        <div class="page-header">
          <h2>Platform Settings</h2>
          <p>Configure system-wide settings</p>
        </div>

        <form id="settingsForm" class="settings-form">
          <div class="settings-section">
            <h3>General Settings</h3>
            <div class="form-group">
              <label for="platformName">Platform Name</label>
              <input type="text" id="platformName" name="platformName" 
                value="${data.settings?.platformName || 'Result App'}" required>
            </div>
            <div class="form-group">
              <label for="supportEmail">Support Email</label>
              <input type="email" id="supportEmail" name="supportEmail" 
                value="${data.settings?.supportEmail || ''}" required>
            </div>
            <div class="form-group">
              <label for="defaultLanguage">Default Language</label>
              <select id="defaultLanguage" name="defaultLanguage">
                <option value="en" ${data.settings?.defaultLanguage === 'en' ? 'selected' : ''}>English</option>
                <option value="es" ${data.settings?.defaultLanguage === 'es' ? 'selected' : ''}>Spanish</option>
                <option value="fr" ${data.settings?.defaultLanguage === 'fr' ? 'selected' : ''}>French</option>
              </select>
            </div>
          </div>

          <div class="settings-section">
            <h3>Feature Toggles</h3>
            <div class="form-group checkbox">
              <label>
                <input type="checkbox" id="registrationEnabled" name="registrationEnabled" 
                  ${data.settings?.registrationEnabled ? 'checked' : ''}>
                <span>Allow New University Registration</span>
              </label>
            </div>
            <div class="form-group checkbox">
              <label>
                <input type="checkbox" id="maintenanceMode" name="maintenanceMode">
                <span>Maintenance Mode</span>
              </label>
            </div>
          </div>

          <div class="settings-actions">
            <button type="submit" class="btn-primary">Save Settings</button>
            <button type="reset" class="btn-secondary">Reset Changes</button>
          </div>
        </form>
      </div>
    `;
  },

  // Helper: Render data table
  renderDataTable: function(data, columns) {
    if (!Array.isArray(data) || data.length === 0) {
      return '<p class="no-data">No records found</p>';
    }

    const headers = columns.map(col => `<th>${col.label}</th>`).join('');
    const rows = data.map(item => `
      <tr>
        ${columns.map(col => {
          let cellValue = item[col.key] || '-';
          // Format dates
          if (col.key.includes('date') || col.key.includes('_at') || col.key.includes('At')) {
            try {
              const date = new Date(cellValue);
              cellValue = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
              // Keep original
            }
          }
          // Format currency
          if (col.key.includes('amount') || col.key.includes('price') || col.key.includes('cost')) {
            if (typeof cellValue === 'number') {
              cellValue = '$' + cellValue.toFixed(2);
            }
          }
          // Format status badge
          if (col.key === 'status') {
            const statusClass = cellValue.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
            cellValue = `<span class="status-badge ${statusClass}">${cellValue}</span>`;
          }
          return `<td>${cellValue}</td>`;
        }).join('')}
      </tr>
    `).join('');

    return `
      <div class="table-container">
        <table class="data-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
};
