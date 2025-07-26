// --- MODERN FIREBASE DASHBOARD.JS ---

import {
  db,
  getCurrentClientSubdomain,
  getClientCollection,
  getClientDoc,
  getClientSettings
} from './firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentClientSubdomain = null;
let clientSettings = {};

window.addEventListener('DOMContentLoaded', async () => {
  // Initialize client context
  currentClientSubdomain = getCurrentClientSubdomain();
  const username = sessionStorage.getItem('username');
  const role = sessionStorage.getItem('role');
  const clientLogoUrl = sessionStorage.getItem('clientLogoUrl');
  const clientName = sessionStorage.getItem('clientName');

  // TEMPORARILY DISABLED FOR PREVIEW
  // if (!currentClientSubdomain || !username || !role) {
  //   window.location.href = "login.html";
  //   return;
  // }
  
  // Set dummy values for preview
  if (!username) sessionStorage.setItem('username', 'Preview User');
  if (!role) sessionStorage.setItem('role', 'admin');
  if (!currentClientSubdomain) currentClientSubdomain = 'preview-client';

  // Load client settings
  try {
    clientSettings = await getClientSettings(currentClientSubdomain);
  } catch (error) {
    console.error('Error loading client settings:', error);
  }

  // Set logo and welcome
  const logoImg = document.getElementById('client-logo');
  if (logoImg && clientLogoUrl) logoImg.src = clientLogoUrl;

  const displayName = clientName || currentClientSubdomain;
  document.getElementById('dashboard-title').textContent = `${displayName.charAt(0).toUpperCase() + displayName.slice(1)} Dashboard`;
  document.getElementById('welcome-message').textContent = username
    ? `Welcome Back, ${username.charAt(0).toUpperCase() + username.slice(1)}!`
    : 'Welcome Back!';

  // Sidebar role-based visibility
  const roleButtonMap = {
    admin:    ['home', 'assets', 'users', 'logs', 'analytics', 'inspections', 'site-settings', 'help'],
    manager:  ['home', 'assets', 'users', 'logs', 'analytics', 'inspections', 'site-settings', 'help'],
    user:     ['home', 'assets', 'logs', 'analytics', 'inspections', 'help'],
    nexus:    [
      'home', 'assets', 'users', 'logs', 'analytics', 'inspections', 'site-settings', 'help',
      'firebase', 'nexus-admin', 'onboard'
    ]
  };

  const allowedPanels = roleButtonMap[role] || roleButtonMap['user'];
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    const panel = btn.id.replace('btn-', '');
    btn.style.display = allowedPanels.includes(panel) ? '' : 'none';
  });

  // Sidebar navigation logic
  const panels = Array.from(document.querySelectorAll('.dashboard-panel'));
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Skip onboard button - it has its own handler for redirect
      if (btn.id === 'btn-onboard') return;
      // Skip users button - it has its own handler for redirect
      if (btn.id === 'btn-users') return;
      // Skip assets button - it has its own handler for redirect
      if (btn.id === 'btn-assets') return;
      // Skip site-settings button - it has its own handler for redirect
      if (btn.id === 'btn-site-settings') return;
      
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      panels.forEach(panelDiv => panelDiv.style.display = 'none');
      const panelId = 'panel-' + btn.id.replace('btn-', '');
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = 'block';
      if (panelId === 'panel-firebase') {
        document.querySelector('.dashboard-right').style.display = 'none';
      } else {
        document.querySelector('.dashboard-right').style.display = '';
      }
      // Only load these when Home is shown
      if (panelId === 'panel-home') {
        loadFailedAssets();
        loadRecentInspections();
        loadAreaStatuses();
      }
    });
  });
  document.getElementById('btn-home').classList.add('active');

  document.getElementById('logout-link').onclick = () => {
    sessionStorage.clear();
    window.location.href = "login.html";
  };

  // --- FIRESTORE DATA LOADERS (COMPAT) ---

  async function loadFailedAssets() {
    const failedAssetsList = document.getElementById('failed-assets-list');
    if (!failedAssetsList) return;
    failedAssetsList.innerHTML = '';
    try {
      // Load all inspection records and filter for failed ones
      const q = query(
        getClientCollection(currentClientSubdomain, 'inspectionRecords'),
        orderBy("inspectionDate", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(q);

      const failedInspections = [];
      snapshot.forEach(doc => {
        const inspection = doc.data();
        // Check if any result in the results object is false (failed)
        if (inspection.results && typeof inspection.results === 'object') {
          const hasFailures = Object.values(inspection.results).some(result => result === false);
          if (hasFailures) {
            failedInspections.push(inspection);
          }
        }
      });

      if (failedInspections.length === 0) {
        failedAssetsList.innerHTML = `<div class="dashboard-placeholder">No failed assets reported.</div>`;
        return;
      }

      // Show only the first 10 failed inspections
      failedInspections.slice(0, 10).forEach(inspection => {
        const line = document.createElement('div');
        line.className = "failed-row";
        const location = inspection.location || {};
        const locationText = `${location.sublocation || 'Unknown Location'} - ${location.zone || 'Zone ?'}`;
        const dateText = inspection.inspectionDate ? new Date(inspection.inspectionDate).toLocaleDateString() : 'Unknown Date';
        line.textContent = `Asset at ${locationText} — Inspected: ${dateText} — Inspector: ${inspection.inspectedBy || 'Unknown'}`;
        failedAssetsList.appendChild(line);
      });
    } catch (e) {
      console.error('Error loading failed assets:', e);
      failedAssetsList.innerHTML = `<div class="dashboard-placeholder">Error loading failed assets.</div>`;
    }
  }

  async function loadRecentInspections() {
    const inspectionList = document.getElementById('inspection-list');
    try {
      const q = query(
        getClientCollection(currentClientSubdomain, 'inspectionRecords'),
        orderBy("inspectionDate", "desc"),
        limit(30)
      );
      const snapshot = await getDocs(q);
      inspectionList.innerHTML = '';
      if (snapshot.empty) {
        inspectionList.innerHTML = `<div class="no-data">No inspection records found for this client.</div>`;
        return;
      }
      snapshot.forEach(doc => {
        if (doc.id !== '_placeholder') {
          const inspection = doc.data();
          const inspectionItem = document.createElement('div');
          inspectionItem.className = 'inspection-compact';

          // Parse the inspection data
          const inspector = inspection.inspectedBy || inspection.inspector || 'Unknown Inspector';
          const location = inspection.location || {};
          const locationText = `${location.sublocation || location.name || 'Unknown Location'}`;
          const zone = location.zone ? ` - ${location.zone}` : '';
          const dateText = inspection.inspectionDate ? new Date(inspection.inspectionDate).toLocaleDateString() : 'Unknown Date';
          const timeText = inspection.inspectionDate ? new Date(inspection.inspectionDate).toLocaleTimeString() : '';
          const passedCount = inspection.results ? Object.values(inspection.results).filter(r => r === true).length : 0;
          const totalCount = inspection.results ? Object.keys(inspection.results).length : 0;
          const status = totalCount > 0 ? (passedCount === totalCount ? 'passed' : (passedCount === 0 ? 'failed' : 'partial')) : 'pending';
          const score = totalCount > 0 ? `${passedCount}/${totalCount}` : 'N/A';

          inspectionItem.innerHTML = `
            <div class="inspection-compact-info">
              <div class="inspection-compact-user">${inspector}</div>
              <div class="inspection-compact-location">${locationText}${zone}</div>
              <div class="inspection-compact-time">${dateText} ${timeText}</div>
            </div>
            <div class="inspection-compact-status">
              <span class="status-badge-compact ${status}">${status}</span>
              <div class="inspection-compact-score">${score}</div>
            </div>
          `;
          inspectionList.appendChild(inspectionItem);
        }
      });
    } catch (e) {
      console.error('Error loading recent inspections:', e);
      inspectionList.innerHTML = `<div class="error">Error loading inspection records.</div>`;
    }
  }

  async function loadAreaStatuses() {
    const table = document.getElementById('area-status-table');
    if (!table) {
      console.log('Area status table not found - home panel was cleaned up');
      return;
    }
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    try {
      const locationsSnapshot = await getDocs(getClientCollection(currentClientSubdomain, 'locations'));
      const now = new Date();
      const locations = [];

      for (const locDoc of locationsSnapshot.docs) {
        if (locDoc.id === '_placeholder') continue;

        const locData = locDoc.data();
        const locationId = locDoc.id;
        const locationName = locData.name || locationId;

        // Count assets in this location
        const assetsSnapshot = await getDocs(
          query(
            getClientCollection(currentClientSubdomain, 'assets'),
            where("location", "==", locationName)
          )
        );

        let activeCount = 0;
        let totalCount = 0;

        assetsSnapshot.forEach(assetDoc => {
          if (assetDoc.id !== '_placeholder') {
            totalCount++;
            const assetData = assetDoc.data();
            if (assetData.status === 'active' || assetData.status === 'Active') {
              activeCount++;
            }
          }
        });

        // Only show locations that have assets or are not default system locations
        if (totalCount > 0 || !locData.isDefault) {
          locations.push({
            name: locationName,
            good: activeCount,
            total: totalCount,
            daysToInspection: null // Can be enhanced later with inspection scheduling
          });
        }
      }

      table.innerHTML = '';
      if (locations.length === 0) {
        table.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;">No locations with assets found</td></tr>';
        return;
      }

      locations.forEach(loc => {
        let status = "green";
        if (loc.good < loc.total) status = "red";
        else if (loc.daysToInspection !== null && loc.daysToInspection < 0) status = "red";
        else if (loc.daysToInspection !== null && loc.daysToInspection < 7) status = "yellow";
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="area-status-location">
          ${loc.name}
          <span class="area-status-indicator ${status}"></span>
        </td>
        <td class="area-status-count">${loc.good} / ${loc.total} assets</td>
        <td class="area-status-count">
          ${loc.daysToInspection === null ? 'N/A' :
            loc.daysToInspection < 0 ? 'Overdue' :
            loc.daysToInspection === 0 ? 'Due today' :
            `Due in ${loc.daysToInspection}d`}
        </td>
      `;
      tbody.appendChild(row);
    });
    } catch (error) {
      console.error('Error loading area statuses:', error);
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#666;">Error loading area statuses</td></tr>';
    }
  }

  // --- LOGS LOADING FUNCTIONALITY ---

  // ===== MODERN LOGS SYSTEM =====

  let allLogs = [];
  let filteredLogs = [];
  let currentFilters = {
    search: '',
    date: '',
    type: '',
    user: ''
  };
  let currentPageSize = 50;
  let currentPage = 1;

  async function loadLogs() {
    const virtualList = document.getElementById('logs-virtual-list');
    if (!virtualList) {
      console.error('logs-virtual-list element not found');
      return;
    }

    try {
      // Show loading state
      virtualList.innerHTML = '<div class="loading">Loading logs...</div>';
      console.log('Loading logs for client:', currentClientSubdomain);

      // Load logs from Firestore
      const q = query(
        getClientCollection(currentClientSubdomain, 'logs'),
        orderBy('timestamp', 'desc'),
        limit(1000) // Load more for better filtering
      );

      const snapshot = await getDocs(q);
      allLogs = [];
      console.log('Logs snapshot size:', snapshot.size);

      snapshot.forEach(doc => {
        if (doc.id !== '_placeholder') {
          const data = doc.data();
          const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

          allLogs.push({
            id: doc.id,
            timestamp,
            type: data.type || 'system',
            action: data.action || 'Unknown action',
            user: data.user || 'Unknown user',
            details: data.details || '',
            assetId: data.assetId || data.asset_id || '',
            location: data.location || '',
            status: data.status || '',
            ...data
          });
        }
      });

      // If no logs exist, create some sample logs for demonstration
      if (allLogs.length === 0) {
        console.log('No logs found, creating sample logs...');
        await createSampleLogs();
        // Reload after creating sample logs
        const newSnapshot = await getDocs(q);
        allLogs = [];
        newSnapshot.forEach(doc => {
          if (doc.id !== '_placeholder') {
            const data = doc.data();
            const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

            allLogs.push({
              id: doc.id,
              timestamp,
              type: data.type || 'system',
              action: data.action || 'Unknown action',
              user: data.user || 'Unknown user',
              details: data.details || '',
              assetId: data.assetId || data.asset_id || '',
              location: data.location || '',
              status: data.status || '',
              ...data
            });
          }
        });
      }

      // Load users for filter dropdown
      await loadUsersForLogFilter();

      // Initialize filters and render
      filteredLogs = [...allLogs];
      setupLogFilters();
      renderLogs();
      updateLogStats();

      console.log(`Loaded ${allLogs.length} logs for client ${currentClientSubdomain}`);
    } catch (error) {
      console.error('Error loading logs:', error);
      console.error('Error details:', error.message);
      virtualList.innerHTML = `
        <div class="logs-empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Error Loading Logs</h3>
          <p>Unable to load logs: ${error.message}</p>
          <button class="retry-btn" onclick="window.loadLogs()">Retry</button>
        </div>
      `;
    }
  }

  // Make loadLogs available globally for retry button
  window.loadLogs = loadLogs;

  async function createSampleLogs() {
    try {
      const currentUser = sessionStorage.getItem('username') || 'admin';
      const now = new Date();

      const sampleLogs = [
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 30), // 30 minutes ago
          type: 'inspection',
          action: 'Monthly inspection completed',
          user: currentUser,
          details: 'Visual inspection passed, all systems operational',
          assetId: 'FE-001',
          location: 'Building A - Floor 1',
          status: 'passed'
        },
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
          type: 'move',
          action: 'Asset relocated',
          user: currentUser,
          details: 'Moved from Storage to Building A - Floor 1',
          assetId: 'AED-003',
          location: 'Building A - Floor 1',
          status: 'completed'
        },
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 4), // 4 hours ago
          type: 'failure',
          action: 'Asset inspection failed',
          user: 'inspector_jane',
          details: 'Pressure gauge reading below minimum threshold',
          assetId: 'FE-007',
          location: 'Building B - Floor 2',
          status: 'failed'
        },
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 6), // 6 hours ago
          type: 'user',
          action: 'User login',
          user: currentUser,
          details: 'Successful login from dashboard',
          location: 'System',
          status: 'success'
        },
        {
          timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
          type: 'system',
          action: 'System maintenance',
          user: 'system',
          details: 'Automated database cleanup completed',
          location: 'System',
          status: 'completed'
        }
      ];

      const logsCollection = getClientCollection(currentClientSubdomain, 'logs');

      for (const logData of sampleLogs) {
        await addDoc(logsCollection, {
          ...logData,
          timestamp: logData.timestamp.toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      console.log('Sample logs created successfully');
    } catch (error) {
      console.error('Error creating sample logs:', error);
    }
  }

  async function loadUsersForLogFilter() {
    try {
      const userFilter = document.getElementById('logs-user-filter');
      if (!userFilter) return;

      const snapshot = await getDocs(getClientCollection(currentClientSubdomain, 'users'));
      const users = new Set();

      snapshot.forEach(doc => {
        if (doc.id !== '_placeholder') {
          const userData = doc.data();
          const username = userData.username || userData.firstName || doc.id;
          if (username) users.add(username);
        }
      });

      // Also add users from logs
      allLogs.forEach(log => {
        if (log.user && log.user !== 'Unknown user') {
          users.add(log.user);
        }
      });

      // Clear and populate dropdown
      userFilter.innerHTML = '<option value="">All Users</option>';
      Array.from(users).sort().forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userFilter.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading users for log filter:', error);
    }
  }

  function setupLogFilters() {
    const searchInput = document.getElementById('logs-search');
    const dateFilter = document.getElementById('logs-date-filter');
    const typeFilter = document.getElementById('logs-type-filter');
    const userFilter = document.getElementById('logs-user-filter');
    const clearFiltersBtn = document.getElementById('logs-clear-filters');
    const pageSizeSelect = document.getElementById('logs-page-size');

    // Search input with debounce
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.search = e.target.value.toLowerCase();
        applyFilters();
      }, 300);
    });

    // Filter dropdowns
    dateFilter?.addEventListener('change', (e) => {
      currentFilters.date = e.target.value;
      applyFilters();
    });

    typeFilter?.addEventListener('change', (e) => {
      currentFilters.type = e.target.value;
      applyFilters();
    });

    userFilter?.addEventListener('change', (e) => {
      currentFilters.user = e.target.value;
      applyFilters();
    });

    // Clear filters
    clearFiltersBtn?.addEventListener('click', () => {
      currentFilters = { search: '', date: '', type: '', user: '' };
      searchInput.value = '';
      dateFilter.value = '';
      typeFilter.value = '';
      userFilter.value = '';
      applyFilters();
    });

    // Page size
    pageSizeSelect?.addEventListener('change', (e) => {
      currentPageSize = parseInt(e.target.value);
      currentPage = 1;
      renderLogs();
      updateLogStats();
    });

    // Export button
    const exportBtn = document.getElementById('logs-export-btn');
    exportBtn?.addEventListener('click', exportLogs);
  }

  function applyFilters() {
    filteredLogs = allLogs.filter(log => {
      // Search filter
      if (currentFilters.search) {
        const searchTerm = currentFilters.search;
        const searchableText = `${log.action} ${log.user} ${log.details} ${log.assetId} ${log.location}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }

      // Date filter
      if (currentFilters.date) {
        const logDate = new Date(log.timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        switch (currentFilters.date) {
          case 'today':
            if (logDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'yesterday':
            if (logDate.toDateString() !== yesterday.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (logDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            if (logDate < monthAgo) return false;
            break;
        }
      }

      // Type filter
      if (currentFilters.type && log.type !== currentFilters.type) return false;

      // User filter
      if (currentFilters.user && log.user !== currentFilters.user) return false;

      return true;
    });

    currentPage = 1;
    renderLogs();
    updateLogStats();
    updateActiveFilters();
  }

  function updateActiveFilters() {
    const activeFiltersDiv = document.getElementById('logs-active-filters');
    const filterTagsDiv = document.getElementById('logs-filter-tags');

    if (!activeFiltersDiv || !filterTagsDiv) return;

    const hasActiveFilters = Object.values(currentFilters).some(filter => filter !== '');

    if (hasActiveFilters) {
      activeFiltersDiv.style.display = 'flex';

      let tags = [];
      if (currentFilters.search) tags.push(`Search: "${currentFilters.search}"`);
      if (currentFilters.date) tags.push(`Date: ${currentFilters.date}`);
      if (currentFilters.type) tags.push(`Type: ${currentFilters.type}`);
      if (currentFilters.user) tags.push(`User: ${currentFilters.user}`);

      filterTagsDiv.innerHTML = tags.map(tag => `
        <span class="filter-tag">
          ${tag}
          <span class="remove-tag" onclick="removeFilter('${tag.split(':')[0].toLowerCase()}')">&times;</span>
        </span>
      `).join('');
    } else {
      activeFiltersDiv.style.display = 'none';
    }
  }

  window.removeFilter = function(filterType) {
    currentFilters[filterType] = '';

    // Update UI elements
    const searchInput = document.getElementById('logs-search');
    const dateFilter = document.getElementById('logs-date-filter');
    const typeFilter = document.getElementById('logs-type-filter');
    const userFilter = document.getElementById('logs-user-filter');

    switch (filterType) {
      case 'search':
        if (searchInput) searchInput.value = '';
        break;
      case 'date':
        if (dateFilter) dateFilter.value = '';
        break;
      case 'type':
        if (typeFilter) typeFilter.value = '';
        break;
      case 'user':
        if (userFilter) userFilter.value = '';
        break;
    }

    applyFilters();
  };

  function renderLogs() {
    const virtualList = document.getElementById('logs-virtual-list');
    if (!virtualList) return;

    if (filteredLogs.length === 0) {
      virtualList.innerHTML = `
        <div class="logs-empty-state">
          <div class="empty-icon">📋</div>
          <h3>No logs found</h3>
          <p>Try adjusting your filters or search criteria.</p>
          <button class="retry-btn" onclick="document.getElementById('logs-clear-filters').click()">Clear Filters</button>
        </div>
      `;
      return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * currentPageSize;
    const endIndex = Math.min(startIndex + currentPageSize, filteredLogs.length);
    const logsToShow = filteredLogs.slice(startIndex, endIndex);

    // Render log entries
    virtualList.innerHTML = logsToShow.map(log => createLogEntryHTML(log)).join('');

    // Add click handlers for expansion
    virtualList.querySelectorAll('.log-entry').forEach(entry => {
      entry.addEventListener('click', (e) => {
        if (e.target.closest('.log-action-btn')) return; // Don't expand when clicking action buttons
        entry.classList.toggle('expanded');
      });
    });
  }

  function createLogEntryHTML(log) {
    // Ensure timestamp is a Date object
    const timestampDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp || Date.now());
    const timestamp = timestampDate.toLocaleString();
    const timeOnly = timestampDate.toLocaleTimeString();
    const dateOnly = timestampDate.toLocaleDateString();

    // Determine log type and icon
    const typeInfo = getLogTypeInfo(log.type);

    // Create summary text
    const summary = createLogSummary(log);
    const subtext = createLogSubtext(log);

    return `
      <div class="log-entry" data-log-id="${log.id}">
        <div class="log-entry-main">
          <div class="log-type-badge ${log.type}">
            ${typeInfo.icon}
          </div>

          <div class="log-content">
            <div class="log-timestamp">${dateOnly} ${timeOnly}</div>
            <div class="log-summary">${summary}</div>
            <div class="log-subtext">${subtext}</div>
          </div>

          <svg class="log-expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>

        <div class="log-details">
          <div class="log-details-grid">
            ${createLogDetailsHTML(log)}
          </div>
          <div class="log-actions">
            ${createLogActionsHTML(log)}
          </div>
        </div>
      </div>
    `;
  }

  function getLogTypeInfo(type) {
    const typeMap = {
      inspection: { icon: '🔍', label: 'Inspection' },
      move: { icon: '📦', label: 'Move' },
      failure: { icon: '⚠️', label: 'Failure' },
      user: { icon: '👤', label: 'User' },
      system: { icon: '⚙️', label: 'System' }
    };

    return typeMap[type] || { icon: '📝', label: 'Log' };
  }

  function createLogSummary(log) {
    switch (log.type) {
      case 'inspection':
        return `${log.action} completed by ${log.user}`;
      case 'move':
        return `Asset moved ${log.details || 'to new location'}`;
      case 'failure':
        return `Asset failure: ${log.action}`;
      case 'user':
        return `User action: ${log.action}`;
      default:
        return log.action || 'System event';
    }
  }

  function createLogSubtext(log) {
    const parts = [];
    if (log.assetId) parts.push(`Asset: ${log.assetId}`);
    if (log.location) parts.push(`Location: ${log.location}`);
    if (log.user && log.user !== 'Unknown user') parts.push(`User: ${log.user}`);
    if (log.status) parts.push(`Status: ${log.status}`);

    return parts.join(' • ') || 'No additional details';
  }

  function createLogDetailsHTML(log) {
    const details = [];

    if (log.assetId) details.push(`
      <div class="log-detail-item">
        <div class="log-detail-label">Asset ID</div>
        <div class="log-detail-value">${log.assetId}</div>
      </div>
    `);

    if (log.location) details.push(`
      <div class="log-detail-item">
        <div class="log-detail-label">Location</div>
        <div class="log-detail-value">${log.location}</div>
      </div>
    `);

    if (log.user) details.push(`
      <div class="log-detail-item">
        <div class="log-detail-label">User</div>
        <div class="log-detail-value">${log.user}</div>
      </div>
    `);

    if (log.status) details.push(`
      <div class="log-detail-item">
        <div class="log-detail-label">Status</div>
        <div class="log-detail-value">${log.status}</div>
      </div>
    `);

    if (log.details) details.push(`
      <div class="log-detail-item">
        <div class="log-detail-label">Details</div>
        <div class="log-detail-value">${log.details}</div>
      </div>
    `);

    details.push(`
      <div class="log-detail-item">
        <div class="log-detail-label">Timestamp</div>
        <div class="log-detail-value">${(log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp || Date.now())).toLocaleString()}</div>
      </div>
    `);

    return details.join('');
  }

  function createLogActionsHTML(log) {
    const actions = [];

    // Copy details action
    actions.push(`
      <button class="log-action-btn" onclick="copyLogDetails('${log.id}')">
        Copy Details
      </button>
    `);

    // Download PDF action (if applicable)
    if (log.type === 'inspection') {
      actions.push(`
        <button class="log-action-btn" onclick="downloadLogPDF('${log.id}')">
          Download PDF
        </button>
      `);
    }

    // Revert action (if applicable and user has permissions)
    if (log.type === 'move' && canRevertLog(log)) {
      actions.push(`
        <button class="log-action-btn danger" onclick="revertLogAction('${log.id}')">
          Revert
        </button>
      `);
    }

    return actions.join('');
  }

  function updateLogStats() {
    const showingText = document.getElementById('logs-showing-text');
    if (!showingText) return;

    const startIndex = (currentPage - 1) * currentPageSize + 1;
    const endIndex = Math.min(currentPage * currentPageSize, filteredLogs.length);
    const total = filteredLogs.length;

    if (total === 0) {
      showingText.textContent = 'No logs found';
    } else {
      showingText.textContent = `Showing ${startIndex}–${endIndex} of ${total} logs`;
    }
  }

  function exportLogs() {
    if (filteredLogs.length === 0) {
      alert('No logs to export');
      return;
    }

    // Create CSV content
    const headers = ['Timestamp', 'Type', 'Action', 'User', 'Asset ID', 'Location', 'Status', 'Details'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        (log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp || Date.now())).toISOString(),
        log.type,
        `"${log.action.replace(/"/g, '""')}"`,
        log.user,
        log.assetId || '',
        log.location || '',
        log.status || '',
        `"${(log.details || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Utility functions for log actions
  window.copyLogDetails = function(logId) {
    const log = allLogs.find(l => l.id === logId);
    if (!log) return;

    const details = `
Log Details:
Timestamp: ${(log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp || Date.now())).toLocaleString()}
Type: ${log.type}
Action: ${log.action}
User: ${log.user}
Asset ID: ${log.assetId || 'N/A'}
Location: ${log.location || 'N/A'}
Status: ${log.status || 'N/A'}
Details: ${log.details || 'N/A'}
    `.trim();

    navigator.clipboard.writeText(details).then(() => {
      // Show success feedback
      const btn = event.target;
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      btn.style.background = 'var(--nexus-success)';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 2000);
    });
  };

  window.downloadLogPDF = function(logId) {
    // Placeholder for PDF download functionality
    alert('PDF download functionality would be implemented here');
  };

  window.revertLogAction = function(logId) {
    // Placeholder for revert functionality
    if (confirm('Are you sure you want to revert this action?')) {
      alert('Revert functionality would be implemented here');
    }
  };

  function canRevertLog(log) {
    // Check if user has permissions to revert this log
    const userRole = sessionStorage.getItem('role');
    return userRole === 'admin' || userRole === 'nexus';
  }

  // ===== MODERN INSPECTIONS PANEL =====

  let allInspections = [];
  let filteredInspections = [];
  let inspectionsLocations = [];
  let inspectionsUsers = [];
  let inspectionsAssetTypes = [];
  let currentInspectionsPageSize = 50;
  let currentInspectionsPage = 1;
  let currentInspectionsFilters = {
    search: '',
    date: '',
    user: '',
    location: '',
    status: '',
    assetType: ''
  };

  async function loadInspectionsPanel() {
    try {
      showInspectionsLoading();

      // Load inspections, locations, users, and asset types in parallel
      await Promise.all([
        loadInspectionsData(),
        loadInspectionsLocations(),
        loadInspectionsUsers(),
        loadInspectionsAssetTypes()
      ]);

      // Initialize filters and render
      filteredInspections = [...allInspections];
      populateInspectionsFilterDropdowns();
      renderInspectionsPanel();
      updateInspectionsStats();
      setupInspectionsEventListeners();

      console.log(`Loaded ${allInspections.length} inspections for client ${currentClientSubdomain}`);
    } catch (error) {
      console.error('Error loading inspections panel:', error);
      showInspectionsError('Failed to load inspections. Please try again.');
    }
  }

  async function loadInspectionsData() {
    try {
      const q = query(
        getClientCollection(currentClientSubdomain, 'inspections'),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );

      const snapshot = await getDocs(q);
      allInspections = [];

      snapshot.forEach(doc => {
        if (doc.id !== '_placeholder') {
          const data = doc.data();
          const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

          allInspections.push({
            id: doc.id,
            timestamp,
            user: data.user || 'Unknown user',
            status: determineInspectionStatus(data),
            assets: data.assets || [],
            scanOrder: data.scanOrder || [],
            locations: groupAssetsByLocation(data.assets || []),
            totalAssets: (data.assets || []).length,
            passedAssets: (data.assets || []).filter(a => a.result === 'pass').length,
            failedAssets: (data.assets || []).filter(a => a.result === 'fail').length,
            ...data
          });
        }
      });

      // If no inspections exist, create sample data
      if (allInspections.length === 0) {
        await createSampleInspectionsData();
        // Reload after creating samples
        const newSnapshot = await getDocs(q);
        allInspections = [];
        newSnapshot.forEach(doc => {
          if (doc.id !== '_placeholder') {
            const data = doc.data();
            const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

            allInspections.push({
              id: doc.id,
              timestamp,
              user: data.user || 'Unknown user',
              status: determineInspectionStatus(data),
              assets: data.assets || [],
              scanOrder: data.scanOrder || [],
              locations: groupAssetsByLocation(data.assets || []),
              totalAssets: (data.assets || []).length,
              passedAssets: (data.assets || []).filter(a => a.result === 'pass').length,
              failedAssets: (data.assets || []).filter(a => a.result === 'fail').length,
              ...data
            });
          }
        });
      }
    } catch (error) {
      console.error('Error loading inspections data:', error);
      throw error;
    }
  }

  async function loadInspectionsLocations() {
    try {
      const snapshot = await getDocs(getClientCollection(currentClientSubdomain, 'locations'));
      inspectionsLocations = [];

      snapshot.forEach(doc => {
        if (doc.id !== '_placeholder') {
          inspectionsLocations.push({
            id: doc.id,
            name: doc.data().name || doc.id,
            ...doc.data()
          });
        }
      });
    } catch (error) {
      console.error('Error loading inspections locations:', error);
    }
  }

  async function loadInspectionsUsers() {
    try {
      const snapshot = await getDocs(getClientCollection(currentClientSubdomain, 'users'));
      inspectionsUsers = [];

      snapshot.forEach(doc => {
        if (doc.id !== '_placeholder') {
          const userData = doc.data();
          inspectionsUsers.push({
            id: doc.id,
            username: userData.username || userData.firstName || doc.id,
            ...userData
          });
        }
      });
    } catch (error) {
      console.error('Error loading inspections users:', error);
    }
  }

  async function loadInspectionsAssetTypes() {
    try {
      // Get unique asset types from inspections
      const assetTypes = new Set();

      allInspections.forEach(inspection => {
        inspection.assets.forEach(asset => {
          if (asset.type) {
            assetTypes.add(asset.type);
          }
        });
      });

      inspectionsAssetTypes = Array.from(assetTypes).sort();
    } catch (error) {
      console.error('Error loading inspections asset types:', error);
    }
  }

  function determineInspectionStatus(data) {
    if (!data.assets || data.assets.length === 0) return 'unknown';

    const totalAssets = data.assets.length;
    const passedAssets = data.assets.filter(a => a.result === 'pass').length;
    const failedAssets = data.assets.filter(a => a.result === 'fail').length;

    if (failedAssets === 0) return 'pass';
    if (passedAssets === 0) return 'fail';
    return 'partial';
  }

  function groupAssetsByLocation(assets) {
    const grouped = {};

    assets.forEach(asset => {
      const location = asset.location || 'Unknown Location';
      if (!grouped[location]) {
        grouped[location] = [];
      }
      grouped[location].push(asset);
    });

    // Sort assets within each location
    Object.keys(grouped).forEach(location => {
      grouped[location] = sortInspectionAssets(grouped[location]);
    });

    return grouped;
  }

  function sortInspectionAssets(assets) {
    // Check if all IDs are numeric
    const allNumeric = assets.every(asset =>
      asset.id && !isNaN(asset.id.replace(/[^0-9]/g, ''))
    );

    // Check if all IDs are letters only
    const allLetters = assets.every(asset =>
      asset.id && /^[A-Za-z]+$/.test(asset.id)
    );

    if (allNumeric) {
      return assets.sort((a, b) => {
        const numA = parseInt(a.id.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.id.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
    } else if (allLetters) {
      return assets.sort((a, b) => a.id.localeCompare(b.id));
    } else {
      // Mixed - use scan order if available
      return assets.sort((a, b) => {
        const orderA = a.scanOrder || 999;
        const orderB = b.scanOrder || 999;
        return orderA - orderB;
      });
    }
  }

  // --- FIREBASE MANAGER EXPLORER (COMPAT) ---

  document.getElementById('btn-firebase').addEventListener('click', () => {
    document.querySelectorAll('.dashboard-panel').forEach(p => p.style.display = 'none');
    document.getElementById('panel-firebase').style.display = 'block';
    const rightPanel = document.querySelector('.dashboard-right');
    if (rightPanel) rightPanel.style.display = 'none';
    window.openFirestorePath([]);
  });

  document.querySelectorAll('.sidebar-btn:not(#btn-firebase)').forEach(btn => {
    btn.addEventListener('click', () => {
      const rightPanel = document.querySelector('.dashboard-right');
      if (rightPanel) rightPanel.style.display = '';
    });
  });

  window.openFirestorePath = async function(pathSegments) {
    const sidebar = document.querySelector('.explorer-sidebar');
    const main = document.querySelector('.explorer-main');
    sidebar.innerHTML = '';
    main.innerHTML = '';

    // Breadcrumbs
    let breadcrumb = '<span style="cursor:pointer;color:#fdd835;" onclick="window.openFirestorePath([])">::root</span>';
    let currentPath = [];
    pathSegments.forEach((seg, i) => {
      currentPath.push(seg);
      breadcrumb += ` / <span style="cursor:pointer;color:#fdd835;" onclick="window.openFirestorePath(${JSON.stringify(currentPath)})">${seg}</span>`;
    });
    main.innerHTML = `<div class="explorer-header">${breadcrumb}</div><div class="explorer-content">Loading...</div>`;

    if (pathSegments.length === 0) {
      // ROOT: show root collections from meta doc
      const metaDoc = await db.collection('meta').doc('rootCollections').get();
      const collectionNames = (metaDoc.exists && metaDoc.data().collections) || [];
      sidebar.innerHTML = '';
      for (const name of collectionNames) {
        const div = document.createElement('div');
        div.className = 'explorer-folder';
        div.textContent = '/' + name;
        div.onclick = () => window.openFirestorePath([name]);
        sidebar.appendChild(div);
      }
      // Add "Create Collection" button
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add New Root Collection';
      addBtn.className = 'explorer-btn';
      addBtn.onclick = async () => {
        const name = prompt('Enter new collection name:');
        if (!name) return;
        // Create a dummy doc to make the collection exist
        await db.collection(name).add({ _created: new Date().toISOString() });
        // Update meta/rootCollections
        const metaRef = db.collection('meta').doc('rootCollections');
        await metaRef.set(
          { collections: Array.from(new Set([...collectionNames, name])) },
          { merge: true }
        );
        window.openFirestorePath([]);
      };
      sidebar.appendChild(addBtn);

      main.querySelector('.explorer-content').innerHTML = '<div style="color:#bbb;">Select a collection to view documents.</div>';
      return;
    }

    // Odd segments: COLLECTION (show documents)
    if (pathSegments.length % 2 === 1) {
      const colRef = db.collection(pathSegments.join('/'));
      const snapshot = await colRef.get();
      sidebar.innerHTML = '';
      main.querySelector('.explorer-content').innerHTML = '';
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const friendly = data.name || data.title || data.label || docSnap.id;
        const displayName = friendly ? friendly : `(ID: ${docSnap.id.slice(0, 6)}…)`;
        const docDiv = document.createElement('div');
        docDiv.className = 'explorer-doc';
        docDiv.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;">${displayName}</span>
            <span>
              <button class="explorer-btn" onclick="window.openFirestorePath(${JSON.stringify([...pathSegments, docSnap.id])})">Open</button>
              <button class="explorer-btn" onclick="window.editDoc('${pathSegments.join('/')}', '${docSnap.id}')">Edit</button>
              <button class="explorer-btn danger" onclick="window.deleteDocPrompt('${pathSegments.join('/')}', '${docSnap.id}')">Delete</button>
            </span>
          </div>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
        main.querySelector('.explorer-content').appendChild(docDiv);
      });
      // Add button to create new doc
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add New Document';
      addBtn.onclick = () => window.addDocPrompt(pathSegments.join('/'));
      main.querySelector('.explorer-content').appendChild(addBtn);

      // Bulk actions buttons
      const bulkDiv = document.createElement('div');
      bulkDiv.style.margin = '18px 0 8px 0';
      bulkDiv.innerHTML = `
        <button class="explorer-btn" onclick="window.showBulkAddModal('${pathSegments.join('/')}')">Bulk Add</button>
        <button class="explorer-btn danger" onclick="window.bulkDeleteSelected('${pathSegments.join('/')}')">Bulk Delete</button>
        <button class="explorer-btn" onclick="window.exportCollectionCSV('${pathSegments.join('/')}')">Export CSV</button>
        <button class="explorer-btn" onclick="window.importCSVModal('${pathSegments.join('/')}')">Import CSV</button>
      `;
      main.querySelector('.explorer-content').appendChild(bulkDiv);
      return;
    }

    // Even segments: DOCUMENT (show subcollections)
    let docPath = pathSegments.join('/');
    let subcollections = [];
    try {
      subcollections = await db.doc(docPath).listCollections();
    } catch (e) {
      sidebar.innerHTML = '<div style="color:#ff5050;">Error loading subcollections.</div>';
      console.error(e);
      return;
    }
    sidebar.innerHTML = '';
    for (const colRef of subcollections) {
      const div = document.createElement('div');
      div.className = 'explorer-folder';
      div.textContent = '/' + colRef.id;
      div.onclick = () => window.openFirestorePath([...pathSegments, colRef.id]);
      sidebar.appendChild(div);
    }
    // Show document data in main
    const docRef = db.doc(docPath);
    const docSnap = await docRef.get();
    const content = main.querySelector('.explorer-content');
    content.innerHTML = `<pre>${JSON.stringify(docSnap.data(), null, 2)}</pre>`;
    const btns = document.createElement('div');
    btns.innerHTML = `
      <button onclick="window.editDoc('${pathSegments.slice(0, -1).join('/')}', '${pathSegments[pathSegments.length - 1]}')">Edit</button>
      <button onclick="window.deleteDocPrompt('${pathSegments.slice(0, -1).join('/')}', '${pathSegments[pathSegments.length - 1]}')">Delete</button>
    `;
    content.appendChild(btns);

    // Audit Log button
    const auditBtn = document.createElement('button');
    auditBtn.className = 'explorer-btn';
    auditBtn.textContent = 'View Audit Log';
    auditBtn.style.marginTop = '16px';
    auditBtn.onclick = () => window.showAuditLogModal();
    main.querySelector('.explorer-content').appendChild(auditBtn);
  };

  // --- CRUD & BULK ACTIONS (COMPAT) ---

  window.addDocPrompt = async function(collectionPath) {
    showExplorerFormModal('Add New Document', {}, async (obj) => {
      try {
        const docRef = await db.collection(collectionPath).add(obj);
        await logAudit("add", `${collectionPath}/${docRef.id}`, sessionStorage.getItem('username') || 'unknown', null, obj);
        window.openFirestorePath(collectionPath.split('/'));
      } catch (e) {
        alert('Error adding document.');
      }
    });
  };

  window.editDoc = async function(collectionPath, docId) {
    const ref = db.collection(collectionPath).doc(docId);
    const docSnap = await ref.get();
    const before = docSnap.data();
    showExplorerFormModal('Edit Document', before || {}, async (obj) => {
      try {
        await ref.set(obj);
        await logAudit("edit", `${collectionPath}/${docId}`, sessionStorage.getItem('username') || 'unknown', before, obj);
        window.openFirestorePath(collectionPath.split('/'));
      } catch (e) {
        alert('Error saving document.');
      }
    });
  };

  window.deleteDocPrompt = async function(collectionPath, docId) {
    const ref = db.collection(collectionPath).doc(docId);
    const docSnap = await ref.get();
    const before = docSnap.data();
    if (!confirm('Delete this document?')) return;
    await ref.delete();
    await logAudit("delete", `${collectionPath}/${docId}`, sessionStorage.getItem('username') || 'unknown', before, null);
    window.openFirestorePath(collectionPath.split('/'));
  };

  async function logAudit(action, path, user, before, after) {
    try {
      await db.collection("audit_log").add({
        timestamp: new Date(),
        user,
        action,
        path,
        before,
        after
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  }

  window.showBulkAddModal = function(collectionPath) {
    let modal = document.getElementById('bulk-add-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bulk-add-modal';
      modal.style = 'display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999;background:rgba(0,0,0,0.45);align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#22345a;padding:28px 24px;border-radius:12px;min-width:320px;max-width:90vw;">
          <div style="font-weight:600;font-size:1.1em;margin-bottom:10px;">Bulk Add (Paste CSV rows below)</div>
          <textarea id="bulk-add-textarea" style="width:100%;height:160px;border-radius:7px;border:none;padding:10px;font-size:1em;background:#1c2942;color:#fff;"></textarea>
          <div style="margin-top:14px;text-align:right;">
            <button id="bulk-add-cancel" class="explorer-btn danger">Cancel</button>
            <button id="bulk-add-save" class="explorer-btn">Add</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const textarea = document.getElementById('bulk-add-textarea');
    textarea.value = '';
    modal.style.display = 'flex';

    function cleanup() {
      modal.style.display = 'none';
      document.getElementById('bulk-add-save').onclick = null;
      document.getElementById('bulk-add-cancel').onclick = null;
    }

    document.getElementById('bulk-add-save').onclick = async () => {
      const lines = textarea.value.trim().split('\n');
      if (!lines.length) return;
      const headers = lines[0].split(',').map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, idx) => obj[h] = values[idx]);
        const docRef = await db.collection(collectionPath).add(obj);
        await logAudit("add", `${collectionPath}/${docRef.id}`, sessionStorage.getItem('username') || 'unknown', null, obj);
      }
      cleanup();
      window.openFirestorePath(collectionPath.split('/'));
    };
    document.getElementById('bulk-add-cancel').onclick = cleanup;
  };

  window.bulkDeleteSelected = async function(collectionPath) {
    const checkboxes = document.querySelectorAll('.bulk-select:checked');
    if (!checkboxes.length) return alert('No documents selected.');
    if (!confirm(`Delete ${checkboxes.length} documents?`)) return;
    for (const cb of checkboxes) {
      await window.deleteDocPrompt(collectionPath, cb.dataset.docid);
    }
  };

  window.exportCollectionCSV = async function(collectionPath) {
    const colRef = db.collection(collectionPath);
    const snapshot = await colRef.get();
    if (snapshot.empty) return alert('No data to export.');
    const docs = [];
    snapshot.forEach(doc => docs.push(doc.data()));
    const headers = Object.keys(docs[0]);
    let csv = headers.join(',') + '\n';
    docs.forEach(doc => {
      csv += headers.map(h => `"${(doc[h] ?? '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collectionPath.replace(/\//g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.importCSVModal = function(collectionPath) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, idx) => obj[h] = values[idx]);
        const docRef = await db.collection(collectionPath).add(obj);
        await logAudit("add", `${collectionPath}/${docRef.id}`, sessionStorage.getItem('username') || 'unknown', null, obj);
      }
      window.openFirestorePath(collectionPath.split('/'));
      alert('Import complete!');
    };
    input.click();
  };

  window.showAuditLogModal = async function() {
    let modal = document.getElementById('audit-log-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'audit-log-modal';
      modal.style = 'display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999;background:rgba(0,0,0,0.45);align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#22345a;padding:28px 24px;border-radius:12px;min-width:320px;max-width:90vw;max-height:90vh;overflow:auto;">
          <div style="font-weight:600;font-size:1.1em;margin-bottom:10px;">Audit Log</div>
          <div id="audit-log-table" style="max-height:60vh;overflow:auto;"></div>
          <div style="margin-top:14px;text-align:right;">
            <button id="audit-log-close" class="explorer-btn danger">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const tableDiv = document.getElementById('audit-log-table');
    modal.style.display = 'flex';
    tableDiv.innerHTML = 'Loading...';
    const snapshot = await db.collection('audit_log').get();
    let html = `<table style="width:100%;font-size:0.97em;"><tr>
      <th>Time</th><th>User</th><th>Action</th><th>Path</th><th>Before</th><th>After</th>
    </tr>`;
    snapshot.forEach(doc => {
      const d = doc.data();
      html += `<tr>
        <td>${d.timestamp ? new Date(d.timestamp).toLocaleString() : ''}</td>
        <td>${d.user || ''}</td>
        <td>${d.action || ''}</td>
        <td style="font-family:monospace;">${d.path || ''}</td>
        <td><pre style="max-width:200px;overflow:auto;">${d.before ? JSON.stringify(d.before, null, 2) : ''}</pre></td>
        <td><pre style="max-width:200px;overflow:auto;">${d.after ? JSON.stringify(d.after, null, 2) : ''}</pre></td>
      </tr>`;
    });
    html += '</table>';
    tableDiv.innerHTML = html;
    document.getElementById('audit-log-close').onclick = () => { modal.style.display = 'none'; };
  };

  // --- FORM MODALS (COMPAT) ---

  function showExplorerFormModal(title, docData, onSave) {
    const modal = document.getElementById('explorer-form-modal');
    document.getElementById('explorer-form-title').textContent = title;
    const form = document.getElementById('explorer-form-fields');
    form.innerHTML = '';
    const keys = docData && Object.keys(docData).length ? Object.keys(docData) : [''];
    keys.forEach(key => {
      const value = docData ? docData[key] : '';
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.margin = '10px 0 4px 0';
      label.textContent = key || 'Field name';
      let input;
      if (typeof value === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.value = value;
      } else if (typeof value === 'boolean') {
        input = document.createElement('select');
        input.innerHTML = `<option value="true">true</option><option value="false">false</option>`;
        input.value = value ? 'true' : 'false';
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = value;
      }
      input.name = key;
      input.style.width = '100%';
      input.style.padding = '7px';
      input.style.borderRadius = '6px';
      input.style.border = 'none';
      input.style.background = '#1c2942';
      input.style.color = '#fff';
      input.style.fontSize = '1em';
      label.appendChild(input);
      form.appendChild(label);
    });
    const addFieldBtn = document.createElement('button');
    addFieldBtn.type = 'button';
    addFieldBtn.textContent = '+ Add Field';
    addFieldBtn.className = 'explorer-btn';
    addFieldBtn.style.marginTop = '10px';
    addFieldBtn.onclick = () => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.margin = '10px 0 4px 0';
      label.textContent = 'Field name';
      const input = document.createElement('input');
      input.type = 'text';
      input.name = '';
      input.value = '';
      input.style.width = '100%';
      input.style.padding = '7px';
      input.style.borderRadius = '6px';
      input.style.border = 'none';
      input.style.background = '#1c2942';
      input.style.color = '#fff';
      input.style.fontSize = '1em';
      label.appendChild(input);
      form.appendChild(label);
    };
    form.appendChild(addFieldBtn);
    modal.style.display = 'flex';
    function cleanup() {
      modal.style.display = 'none';
      form.onsubmit = null;
      document.getElementById('explorer-form-cancel').onclick = null;
    }
    form.onsubmit = (e) => {
      e.preventDefault();
      const inputs = Array.from(form.querySelectorAll('input, select'));
      const obj = {};
      for (const input of inputs) {
        const key = input.name.trim() || input.previousSibling.textContent.trim();
        if (!key) continue;
        if (input.type === 'number') {
          obj[key] = input.value === '' ? null : Number(input.value);
        } else if (input.tagName === 'SELECT') {
          obj[key] = input.value === 'true';
        } else {
          obj[key] = input.value;
        }
      }
      onSave(obj);
      cleanup();
    };
    document.getElementById('explorer-form-cancel').onclick = cleanup;
  }

  loadFailedAssets();
  loadRecentInspections();
  loadAreaStatuses();

  async function deleteRootCollection(collectionName) {
    // Delete all docs in the collection
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Remove from meta/rootCollections
    const metaRef = db.collection('meta').doc('rootCollections');
    await db.runTransaction(async (transaction) => {
      const metaDoc = await transaction.get(metaRef);
      if (metaDoc.exists) {
        let collections = metaDoc.data().collections || [];
        collections = collections.filter(name => name !== collectionName);
        transaction.set(metaRef, { collections }, { merge: true });
      }
    });
  }

  // --- INSPECTIONS FUNCTIONALITY ---
  document.getElementById('btn-inspections').addEventListener('click', function() {
    // Show inspections panel and load data
    document.querySelectorAll('.dashboard-panel').forEach(p => p.style.display = 'none');
    document.getElementById('panel-inspections').style.display = 'block';
    loadInspectionsPanel();
  });

  // --- LOGS FUNCTIONALITY ---
  document.getElementById('btn-logs').addEventListener('click', function() {
    // Show logs panel and load data
    document.querySelectorAll('.dashboard-panel').forEach(p => p.style.display = 'none');
    document.getElementById('panel-logs').style.display = 'block';
    loadLogs();
  });

  // --- MANAGE USERS FUNCTIONALITY ---
  document.getElementById('btn-users').addEventListener('click', function() {
    // Redirect to the modernized manage users page
    window.location.href = 'manage-users.html';
  });

  // --- MANAGE ASSETS FUNCTIONALITY ---
  document.getElementById('btn-assets').addEventListener('click', function() {
    // Redirect to the modernized manage assets page
    window.location.href = 'manage-assets.html';
  });

  // --- SITE SETTINGS FUNCTIONALITY ---
  document.getElementById('btn-site-settings').addEventListener('click', function() {
    // Redirect to the site settings page
    window.location.href = 'site-settings.html';
  });

  // --- NEXUS ADMIN FUNCTIONALITY ---

  // Initialize nexus admin modal when button is clicked
  document.getElementById('btn-nexus-admin').addEventListener('click', () => {
    if (role !== 'nexus') {
      alert('Access denied. This feature is restricted to Nexus users.');
      return;
    }
    // Open nexus-admin.html in a modal
    openNexusAdminModal();
  });

  // --- ONBOARD CLIENT FUNCTIONALITY ---

  // Initialize onboard form when panel is shown
  document.getElementById('btn-onboard').addEventListener('click', () => {
    if (role !== 'nexus') {
      alert('Access denied. This feature is restricted to Nexus users.');
      return;
    }
    // Redirect to the standalone onboard page
    window.location.href = 'onboard.html';
  });

  // --- NEXUS ADMIN MODAL FUNCTION ---

  function openNexusAdminModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    // Create modal content container
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
      background: var(--nexus-card);
      border: 1px solid var(--nexus-border);
      border-radius: var(--radius);
      max-width: 95vw;
      max-height: 95vh;
      overflow: hidden;
      box-shadow: var(--shadow-heavy);
      position: relative;
    `;

    // Create iframe to load nexus-admin.html
    const iframe = document.createElement('iframe');
    iframe.src = 'nexus-admin.html';
    iframe.style.cssText = `
      width: 1200px;
      height: 800px;
      border: none;
      border-radius: var(--radius);
    `;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: var(--nexus-error);
      color: var(--nexus-light);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 24px;
      cursor: pointer;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Close modal function
    const closeModal = () => {
      document.body.removeChild(modalOverlay);
    };

    // Event listeners
    closeButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Escape key to close
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Assemble modal
    modalContent.appendChild(iframe);
    modalContent.appendChild(closeButton);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
  }

});
