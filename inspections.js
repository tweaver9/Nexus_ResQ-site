// inspections.js - Live Firestore data for inspections page

import { 
  db, 
  getCurrentClientSubdomain, 
  getClientCollection, 
  loadAssetTypesWithFallback 
} from './firebase.js';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Global state
let currentClientSubdomain = null;
let allInspections = [];
let filteredInspections = [];
let users = [];
let locations = [];
let assetTypes = [];

// DOM elements
const searchInput = document.getElementById('searchInput');
const userFilter = document.getElementById('userFilter');
const locationFilter = document.getElementById('locationFilter');
const assetTypeFilter = document.getElementById('assetTypeFilter');
const tableBody = document.getElementById('inspectionsTableBody');
const filterButtons = document.querySelectorAll('.filter-btn');

// Test function for manual validation
window.validateNexusInspections = function() {
  console.log('🚀 NEXUS INSPECTIONS VALIDATION TEST');
  console.log('=====================================');
  console.log(`📊 Total inspections loaded: ${allInspections.length}`);
  console.log(`🔍 Filtered inspections: ${filteredInspections.length}`);
  console.log(`🔗 Firebase collection path: clients/${currentClientSubdomain}/inspections`);
  console.log(`👤 Current user: ${sessionStorage.getItem('username')}`);
  console.log(`🏢 Client ID: ${sessionStorage.getItem('tenant_id')}`);
  
  if (allInspections.length > 0) {
    console.log('📋 Sample inspection keys:');
    allInspections.slice(0, 3).forEach((inspection, index) => {
      console.log(`  ${index + 1}. InspectionKey: ${inspection.id}`);
    });
  }
  
  console.log('✅ Validation complete! Check above for details.');
};

// Initialize page
window.addEventListener('DOMContentLoaded', async () => {
  // Check authentication and client context - TEMPORARILY DISABLED FOR PREVIEW
  currentClientSubdomain = getCurrentClientSubdomain() || 'preview-client';
  
  // Set dummy values for preview
  if (!sessionStorage.getItem('username')) sessionStorage.setItem('username', 'Preview User');
  if (!sessionStorage.getItem('tenant_id')) sessionStorage.setItem('tenant_id', 'preview-client');
  if (!sessionStorage.getItem('role')) sessionStorage.setItem('role', 'admin');
  
  // TEMPORARILY DISABLED FOR PREVIEW
  // if (!currentClientSubdomain) {
  //   window.location.href = 'login.html';
  //   return;
  // }

  // Load all data
  await Promise.all([
    loadInspections(),
    loadUsers(),
    loadLocations(),
    loadAssetTypes()
  ]);

  // Set up event listeners
  setupEventListeners();
  
  // Initial render
  renderInspections();
});

// Load inspections from client-specific collection
async function loadInspections() {
  try {
    const q = query(
      getClientCollection(currentClientSubdomain, 'inspections'),
      orderBy('timestamp', 'desc'),
      limit(500) // Limit to recent 500 inspections for performance
    );
    
    const snapshot = await getDocs(q);
    allInspections = [];
    
    snapshot.forEach(doc => {
      if (doc.id !== '_placeholder') {
        const data = doc.data();
        allInspections.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
        });
      }
    });
    
    filteredInspections = [...allInspections];
    console.log(`✅ Loaded ${allInspections.length} inspections for client ${currentClientSubdomain}`);
    
    // Debug: Show first inspection structure
    if (allInspections.length > 0) {
      console.log('📋 Sample inspection structure:', allInspections[0]);
      console.log('🔑 InspectionKey (document ID):', allInspections[0].id);
    }
  } catch (error) {
    console.error('Error loading inspections:', error);
    showError('Failed to load inspections');
  }
}

// Load users for filter dropdown
async function loadUsers() {
  try {
    const snapshot = await getDocs(getClientCollection(currentClientSubdomain, 'users'));
    users = [];
    
    snapshot.forEach(doc => {
      if (doc.id !== '_placeholder') {
        const data = doc.data();
        users.push({
          id: doc.id,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName
        });
      }
    });
    
    // Populate user filter dropdown
    userFilter.innerHTML = '<option value="">All Users</option>';
    users.forEach(user => {
      const displayName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username;
      userFilter.innerHTML += `<option value="${user.username}">${displayName}</option>`;
    });
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Load locations for filter dropdown
async function loadLocations() {
  try {
    const snapshot = await getDocs(getClientCollection(currentClientSubdomain, 'locations'));
    locations = [];
    
    snapshot.forEach(doc => {
      if (doc.id !== '_placeholder') {
        const data = doc.data();
        locations.push({
          id: doc.id,
          name: data.name,
          isDefault: data.isDefault || false
        });
      }
    });
    
    // Populate location filter dropdown
    locationFilter.innerHTML = '<option value="">All Locations</option>';
    locations.forEach(location => {
      locationFilter.innerHTML += `<option value="${location.name}">${location.name}</option>`;
    });
  } catch (error) {
    console.error('Error loading locations:', error);
  }
}

// Load asset types for filter dropdown
async function loadAssetTypes() {
  try {
    const types = await loadAssetTypesWithFallback(currentClientSubdomain);
    assetTypes = types;
    
    // Populate asset type filter dropdown
    assetTypeFilter.innerHTML = '<option value="">All Types</option>';
    assetTypes.forEach(type => {
      const name = type.name || type.id;
      assetTypeFilter.innerHTML += `<option value="${name}">${name}</option>`;
    });
  } catch (error) {
    console.error('Error loading asset types:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Search input
  searchInput.addEventListener('input', debounce(applyFilters, 300));
  
  // Filter dropdowns
  userFilter.addEventListener('change', applyFilters);
  locationFilter.addEventListener('change', applyFilters);
  assetTypeFilter.addEventListener('change', applyFilters);
  
  // Status filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });
}

// Apply all filters
function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedUser = userFilter.value;
  const selectedLocation = locationFilter.value;
  const selectedAssetType = assetTypeFilter.value;
  const selectedStatus = document.querySelector('.filter-btn.active')?.dataset.status || '';
  
  filteredInspections = allInspections.filter(inspection => {
    // Search filter
    if (searchTerm) {
      const searchableText = [
        inspection.id || '',              // InspectionKey (document ID)
        inspection.inspectionKey || '',   // InspectionKey if stored in document
        inspection.assetId || '',
        inspection.assetName || '',
        inspection.user || '',
        inspection.location || '',
        inspection.zone || ''
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) return false;
    }
    
    // User filter
    if (selectedUser && inspection.user !== selectedUser) return false;
    
    // Location filter
    if (selectedLocation && inspection.location !== selectedLocation && inspection.zone !== selectedLocation) return false;
    
    // Asset type filter
    if (selectedAssetType && inspection.assetType !== selectedAssetType) return false;
    
    // Status filter
    if (selectedStatus) {
      const result = (inspection.result || '').toLowerCase();
      if (selectedStatus === 'pass' && result !== 'pass') return false;
      if (selectedStatus === 'fail' && result !== 'fail') return false;
      if (selectedStatus === 'pending' && result !== 'pending' && result !== '') return false;
    }
    
    return true;
    });

  // Debug: Log filter results
  if (searchTerm) {
    console.log(`🔍 Search "${searchTerm}" returned ${filteredInspections.length} results`);
  }

  renderInspections();
}

// Render inspections table
function renderInspections() {
  if (filteredInspections.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-icon">📋</div>
          <div>No inspections found matching your filters</div>
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = filteredInspections.map(inspection => {
    const result = (inspection.result || '').toLowerCase();
    const statusClass = result === 'pass' ? 'status-pass' : 
                       result === 'fail' ? 'status-fail' : 'status-pending';
    const statusText = result || 'Pending';
    
    const date = inspection.timestamp ? 
      inspection.timestamp.toLocaleDateString() + ' ' + inspection.timestamp.toLocaleTimeString() :
      'Unknown';
    
    return `
      <tr>
        <td>${inspection.assetName || inspection.assetId || 'Unknown Asset'}</td>
        <td>${inspection.user || 'Unknown User'}</td>
        <td>${inspection.assetType || 'Unknown Type'}</td>
        <td>${inspection.location || inspection.zone || 'Unknown Location'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${date}</td>
        <td>
          <button class="pdf-btn" onclick="downloadPDF('${inspection.id}')" title="Download PDF">
            📄
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Download PDF function (placeholder)
window.downloadPDF = function(inspectionId) {
  // TODO: Implement PDF generation/download
  alert(`PDF download for inspection ${inspectionId} will be implemented.`);
  console.log('PDF download requested for inspection:', inspectionId);
};

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showError(message) {
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state" style="color: var(--nexus-error);">
        <div class="empty-icon">⚠️</div>
        <div>${message}</div>
      </td>
    </tr>
  `;
}
