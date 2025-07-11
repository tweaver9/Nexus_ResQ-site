// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyAqnCQnFROLiVsQPIvgOe7mAciDiwCuLOg",
    authDomain: "nexus-res-q.firebaseapp.com",
    projectId: "nexus-res-q",
    storageBucket: "nexus-res-q.appspot.com",
    messagingSenderId: "203995658810",
    appId: "1:203995658810:web:97ae2ef0e9d1ed785cd303",
    measurementId: "G-B7B1QZVWFG"
  });
}
const db = firebase.firestore();

// ========== STATE ==========
let currentClientId = sessionStorage.getItem('tenant_id') || "demo";
let allAssets = [];
let assetTypeStats = {};
let currentAssetType = null;
let filteredAssets = [];

// ========== UTILITY FUNCTIONS ==========

// Pretty casing for asset types
function formatAssetType(assetType) {
  if (!assetType) return 'Unknown';
  
  // Common abbreviations/acronyms that should be all uppercase
  const acronyms = ['SCBA', 'AED', 'CPR', 'EMS', 'NFPA', 'OSHA', 'PPE', 'HVAC', 'UPS', 'GPS'];
  
  // Check if it's an acronym
  if (acronyms.includes(assetType.toUpperCase())) {
    return assetType.toUpperCase();
  }
  
  // For regular names, apply title case
  return assetType
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format hydro due date from ISO to MM/YY
function formatHydroDue(hydroDue) {
  if (!hydroDue) return 'N/A';
  
  try {
    const date = new Date(hydroDue);
    if (isNaN(date.getTime())) return 'N/A';
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
  } catch (error) {
    console.error('Error formatting hydro due date:', error);
    return 'N/A';
  }
}

// Utility: Check if asset type should show Hydro Due
function shouldShowHydroDue(assetType) {
  if (!assetType) return false;
  const type = assetType.toString().toLowerCase();
  return type === 'fire extinguisher' || type === 'scba';
}

// Format Last Monthly Inspection as MM/DD/YYYY
function formatInspectionDate(dateStr) {
  if (!dateStr) return 'Not inspected';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Not inspected';
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return 'Not inspected';
  }
}

// ========== INITIALIZATION ==========
window.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading(true);
    await loadAllAssets();
    renderAssetTypeCards();
    setupEventListeners();
    updateStats();
  } catch (error) {
    console.error('Error initializing:', error);
    showToast('Error loading assets', { type: 'error' });
  } finally {
    showLoading(false);
  }
});

// ========== LOAD ASSETS ==========
async function loadAllAssets() {
  allAssets = [];
  assetTypeStats = {};

  try {
    const assetsRef = db.collection('clients').doc(currentClientId).collection('assets');
    const snapshot = await assetsRef.get();
    
    snapshot.forEach(doc => {
      const asset = { id: doc.id, ...doc.data() };
      allAssets.push(asset);

      // Build asset type statistics
      const assetType = asset.type || 'Unknown';
      if (!assetTypeStats[assetType]) {
        assetTypeStats[assetType] = { total: 0, failed: 0 };
      }
      assetTypeStats[assetType].total++;

      // Count failed assets (status = false or 'failed')
      if (asset.status === false || asset.status === 'failed') {
        assetTypeStats[assetType].failed++;
      }
    });

    console.log('Loaded assets:', allAssets);
    console.log('Asset type stats:', assetTypeStats);
  } catch (error) {
    console.error('Error loading assets:', error);
    throw error;
  }
}

// ========== RENDER ASSET TYPE CARDS ==========
function renderAssetTypeCards() {
  const grid = document.getElementById('asset-type-grid');
  grid.innerHTML = '';

  const assetTypes = Object.keys(assetTypeStats).filter(type => assetTypeStats[type].total > 0);
  
  if (assetTypes.length === 0) {
    document.getElementById('no-assets-msg').style.display = 'block';
    return;
  }

  document.getElementById('no-assets-msg').style.display = 'none';

  assetTypes.forEach(assetType => {
    const stats = assetTypeStats[assetType];
    const card = createAssetTypeCard(assetType, stats);
    grid.appendChild(card);
  });

  document.getElementById('total-count').textContent = allAssets.length;
}

function createAssetTypeCard(assetType, stats) {
  const card = document.createElement('div');
  card.className = 'asset-type-card';
  
  const formattedType = formatAssetType(assetType);
  const initial = formattedType.charAt(0).toUpperCase();
  
  card.innerHTML = `
    <div class="asset-type-header">
      <div class="asset-type-avatar">${initial}</div>
      <div class="asset-type-info">
        <div class="asset-type-name">${formattedType}</div>
        <div class="asset-type-stats">
          <span class="total-count">Total: ${stats.total}</span>
          <span class="failed-count">Failed: ${stats.failed}</span>
        </div>
      </div>
    </div>
  `;

  card.addEventListener('click', () => {
    showAssetsOfType(assetType);
  });

  return card;
}

// ========== SHOW ASSETS OF TYPE ==========
function showAssetsOfType(assetType) {
  currentAssetType = assetType;
  
  // Update UI state
  const formattedType = formatAssetType(assetType);
  document.getElementById('section-title').textContent = `${formattedType} Assets`;
  document.getElementById('asset-type-grid').style.display = 'none';
  document.getElementById('back-to-types-btn').style.display = 'block';
  document.getElementById('search-sort-bar').style.display = 'flex';
  document.getElementById('asset-grid').style.display = 'grid';

  // Filter assets for this type
  filteredAssets = allAssets.filter(asset => asset.type === assetType);
  
  // Update count
  document.getElementById('total-count').textContent = filteredAssets.length;
  
  // Render assets
  renderAssetCards();
}

// ========== RENDER ASSET CARDS ==========
function renderAssetCards() {
  const grid = document.getElementById('asset-grid');
  grid.innerHTML = '';

  if (filteredAssets.length === 0) {
    grid.innerHTML = '<div class="empty-group">No assets found for this type.</div>';
    return;
  }

  filteredAssets.forEach(asset => {
    const card = createAssetCard(asset);
    grid.appendChild(card);
  });
}

function createAssetCard(asset) {
  const card = document.createElement('div');
  card.className = 'asset-card';
  
  const initial = (asset.subType || asset.type || 'A').charAt(0).toUpperCase();
  const assetId = asset.id || 'No ID';
  const subType = asset.subType || 'N/A';
  const hydroDue = shouldShowHydroDue(asset.type) ? formatHydroDue(asset.hydro_due) : null;
  const sublocation = asset.sublocation_name || 'N/A';
  const preciseLocation = asset.precise_location_name || 'N/A';
  const status = asset.status === false || asset.status === 'failed' ? 'Failed' : 'Active';
  
  // Monthly inspection status
  const monthlyStatus = getMonthlyInspectionStatus(asset.last_monthly_inspection);
  
  card.innerHTML = `
    <div class="asset-header">
      <div class="asset-avatar">${initial}</div>
      <div class="asset-info">
        <div class="asset-name">${assetId}</div>
        <div class="asset-subtype">${subType}</div>
      </div>
    </div>
    
    <div class="asset-details">
      ${hydroDue !== null ? `<div class="detail-label">Hydro Due:</div><div class="detail-value">${hydroDue}</div>` : ''}
      <div class="detail-label">Sublocation:</div>
      <div class="detail-value">${sublocation}</div>
      
      <div class="detail-label">Precise Location:</div>
      <div class="detail-value">${preciseLocation}</div>
      
      <div class="detail-label">Status:</div>
      <div class="detail-value">${status}</div>
    </div>
    
    <div class="monthly-status">
      <div class="status-indicator ${monthlyStatus.indicator}"></div>
      <div class="status-text">
        Monthly: ${monthlyStatus.checkMark}
      </div>
    </div>
  `;

  card.addEventListener('click', () => {
    showAssetDetails(asset);
  });

  return card;
}

// ========== MONTHLY INSPECTION STATUS ==========
function getMonthlyInspectionStatus(lastInspection) {
  if (!lastInspection) {
    return { indicator: 'overdue', checkMark: '' };
  }

  try {
    // Parse the timestamp format: "YYYY-MM-DDTHH:mm:ss.ssssss"
    const inspectionDate = new Date(lastInspection);
    const now = new Date();
    
    // Check if inspection was done in current month and year
    const isCurrentMonth = inspectionDate.getMonth() === now.getMonth() && 
                          inspectionDate.getFullYear() === now.getFullYear();
    
    if (isCurrentMonth) {
      return { indicator: 'complete', checkMark: '✔️' };
    } else {
      return { indicator: 'due-soon', checkMark: '' };
    }
  } catch (error) {
    console.error('Error parsing inspection date:', error);
    return { indicator: 'overdue', checkMark: '' };
  }
}

// ========== BACK TO TYPES ==========
function backToTypes() {
  currentAssetType = null;
  
  // Update UI state
  document.getElementById('section-title').textContent = 'Asset Types';
  document.getElementById('asset-type-grid').style.display = 'grid';
  document.getElementById('back-to-types-btn').style.display = 'none';
  document.getElementById('search-sort-bar').style.display = 'none';
  document.getElementById('asset-grid').style.display = 'none';
  
  // Update count
  document.getElementById('total-count').textContent = allAssets.length;
}

// ========== SEARCH AND SORT ==========
function setupSearchAndSort() {
  const searchInput = document.getElementById('asset-search');
  const sortSelect = document.getElementById('asset-sort');

  searchInput.addEventListener('input', applySearchAndSort);
  sortSelect.addEventListener('change', applySearchAndSort);
}

function applySearchAndSort() {
  if (!currentAssetType) return;

  const searchTerm = document.getElementById('asset-search').value.toLowerCase();
  const sortBy = document.getElementById('asset-sort').value;

  // Filter assets
  let results = allAssets.filter(asset => asset.type === currentAssetType);

  // Apply search
  if (searchTerm) {
    results = results.filter(asset => 
      (asset.id || '').toLowerCase().includes(searchTerm) ||
      (asset.subType || '').toLowerCase().includes(searchTerm) ||
      (asset.sublocation_name || '').toLowerCase().includes(searchTerm) ||
      (asset.precise_location_name || '').toLowerCase().includes(searchTerm)
    );
  }

  // Apply sorting
  switch (sortBy) {
    case 'id-asc':
      results.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
      break;
    case 'id-desc':
      results.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      break;
    case 'status':
      results.sort((a, b) => {
        const aStatus = a.status === false || a.status === 'failed' ? 0 : 1;
        const bStatus = b.status === false || b.status === 'failed' ? 0 : 1;
        return aStatus - bStatus;
      });
      break;
    case 'last-inspected':
      results.sort((a, b) => {
        const aDate = new Date(a.last_monthly_inspection || 0);
        const bDate = new Date(b.last_monthly_inspection || 0);
        return bDate - aDate;
      });
      break;
  }

  filteredAssets = results;
  renderAssetCards();
  document.getElementById('total-count').textContent = results.length;
}

// ========== ASSET DETAILS MODAL ==========
function showAssetDetails(asset) {
  const content = document.getElementById('asset-detail-content');
  const formattedType = formatAssetType(asset.type);
  const hydroDue = shouldShowHydroDue(asset.type) ? formatHydroDue(asset.hydro_due) : null;
  
  content.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <h4 style="color: var(--nexus-yellow); margin-bottom: 0.5rem;">${asset.subType || ''}</h4>
      <p style="color: var(--nexus-muted);">${formattedType || 'Unknown Type'}</p>
    </div>
    
    <div style="display: grid; gap: 1rem;">
      <div>
        <strong style="color: var(--nexus-light);">Asset ID:</strong>
        <span style="color: var(--nexus-muted); margin-left: 0.5rem;">${asset.id || 'Not set'}</span>
      </div>
      
      <div>
        <strong style="color: var(--nexus-light);">Subtype:</strong>
        <span style="color: var(--nexus-muted); margin-left: 0.5rem;">${asset.subType || 'Not set'}</span>
      </div>
      
      ${hydroDue !== null ? `<div><strong style=\"color: var(--nexus-light);\">Hydro Due:</strong><span style=\"color: var(--nexus-muted); margin-left: 0.5rem;\">${hydroDue}</span></div>` : ''}
      
      <div>
        <strong style="color: var(--nexus-light);">Sublocation:</strong>
        <span style="color: var(--nexus-muted); margin-left: 0.5rem;">${asset.sublocation_name || 'Not set'}</span>
      </div>
      
      <div>
        <strong style="color: var(--nexus-light);">Precise Location:</strong>
        <span style="color: var(--nexus-muted); margin-left: 0.5rem;">${asset.precise_location_name || 'Not set'}</span>
      </div>
      
      <div>
        <strong style="color: var(--nexus-light);">Status:</strong>
        <span style="color: var(--nexus-success); margin-left: 0.5rem;">
          ${asset.status === false || asset.status === 'failed' ? 'Failed' : 'Active'}
        </span>
      </div>
      
      <div>
        <strong style="color: var(--nexus-light);">Last Monthly Inspection:</strong>
        <span style="color: var(--nexus-muted); margin-left: 0.5rem;">${formatInspectionDate(asset.last_monthly_inspection)}</span>
      </div>
    </div>
  `;
  
  document.getElementById('asset-detail-modal').classList.add('active');
}

// ========== ADD ASSET FUNCTIONALITY ==========
function showAddAssetModal() {
  const content = document.getElementById('add-asset-modal-content');
  
  // Get existing asset types for dropdown
  const existingTypes = Object.keys(assetTypeStats).map(type => formatAssetType(type));
  
  content.innerHTML = `
    <form id="add-asset-form">
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; color: var(--nexus-light); margin-bottom: 0.5rem; font-weight: 500;">
          Asset Type:
        </label>
        <select id="asset-type-select" style="width: 100%; padding: 0.75rem; background: var(--nexus-card-hover); border: 1px solid var(--nexus-border); border-radius: var(--radius-sm); color: var(--nexus-light); margin-bottom: 1rem;">
          <option value="">Select existing type or enter custom...</option>
          ${existingTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
        </select>
        <input type="text" id="custom-asset-type" placeholder="Or enter custom asset type..." style="width: 100%; padding: 0.75rem; background: var(--nexus-card-hover); border: 1px solid var(--nexus-border); border-radius: var(--radius-sm); color: var(--nexus-light); display: none;">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; color: var(--nexus-light); margin-bottom: 0.5rem; font-weight: 500;">
          Asset ID:
        </label>
        <input type="text" id="asset-id" required style="width: 100%; padding: 0.75rem; background: var(--nexus-card-hover); border: 1px solid var(--nexus-border); border-radius: var(--radius-sm); color: var(--nexus-light);">
      </div>
      
      <div style="margin-bottom: 1.5rem;" id="hydro-due-field" style="display:none;">
        <label style="display: block; color: var(--nexus-light); margin-bottom: 0.5rem; font-weight: 500;">
          Hydro Due Date:
        </label>
        <input type="date" id="hydro-due" style="width: 100%; padding: 0.75rem; background: var(--nexus-card-hover); border: 1px solid var(--nexus-border); border-radius: var(--radius-sm); color: var(--nexus-light);">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; color: var(--nexus-light); margin-bottom: 0.5rem; font-weight: 500;">
          Sublocation:
        </label>
        <input type="text" id="sublocation" style="width: 100%; padding: 0.75rem; background: var(--nexus-card-hover); border: 1px solid var(--nexus-border); border-radius: var(--radius-sm); color: var(--nexus-light);">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; color: var(--nexus-light); margin-bottom: 0.5rem; font-weight: 500;">
          Precise Location:
        </label>
        <input type="text" id="precise-location" style="width: 100%; padding: 0.75rem; background: var(--nexus-card-hover); border: 1px solid var(--nexus-border); border-radius: var(--radius-sm); color: var(--nexus-light);">
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button type="button" id="cancel-add-asset" style="padding: 0.75rem 1.5rem; background: var(--nexus-card); border: 1px solid var(--nexus-border); border-radius: var(--radius-sm); color: var(--nexus-light); cursor: pointer;">
          Cancel
        </button>
        <button type="submit" style="padding: 0.75rem 1.5rem; background: var(--nexus-success); border: none; border-radius: var(--radius-sm); color: white; cursor: pointer; font-weight: 500;">
          Add Asset
        </button>
      </div>
    </form>
  `;
  
  // Show modal
  document.getElementById('add-asset-modal').classList.add('active');
  
  // Setup form event listeners
  setupAddAssetFormListeners();
}

function setupAddAssetFormListeners() {
  const typeSelect = document.getElementById('asset-type-select');
  const customTypeInput = document.getElementById('custom-asset-type');
  const form = document.getElementById('add-asset-form');
  const cancelBtn = document.getElementById('cancel-add-asset');
  const hydroDueField = document.getElementById('hydro-due-field');
  // Show/hide Hydro Due field based on type
  function updateHydroDueVisibility() {
    let assetType = typeSelect.value;
    if (!assetType && customTypeInput.value.trim()) {
      assetType = customTypeInput.value.trim();
    }
    if (shouldShowHydroDue(assetType)) {
      hydroDueField.style.display = 'block';
    } else {
      hydroDueField.style.display = 'none';
    }
  }
  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === '') {
      customTypeInput.style.display = 'block';
      customTypeInput.focus();
    } else {
      customTypeInput.style.display = 'none';
      customTypeInput.value = '';
    }
    updateHydroDueVisibility();
  });
  customTypeInput.addEventListener('input', updateHydroDueVisibility);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addAsset();
  });
  cancelBtn.addEventListener('click', () => {
    document.getElementById('add-asset-modal').classList.remove('active');
  });
  updateHydroDueVisibility();
}

async function addAsset() {
  try {
    const typeSelect = document.getElementById('asset-type-select');
    const customTypeInput = document.getElementById('custom-asset-type');
    const assetId = document.getElementById('asset-id').value.trim();
    const assetSubtype = document.getElementById('asset-subtype') ? document.getElementById('asset-subtype').value.trim() : '';
    const hydroDue = document.getElementById('hydro-due') ? document.getElementById('hydro-due').value : '';
    const sublocation = document.getElementById('sublocation').value.trim();
    const preciseLocation = document.getElementById('precise-location').value.trim();
    let assetType = typeSelect.value;
    if (!assetType && customTypeInput.value.trim()) {
      assetType = customTypeInput.value.trim();
    }
    if (!assetType || !assetId) {
      showToast('Asset type and ID are required', { type: 'error' });
      return;
    }
    // Only include hydro_due if relevant
    const assetData = {
      type: assetType,
      id: assetId,
      subType: assetSubtype || null,
      sublocation_name: sublocation || null,
      precise_location_name: preciseLocation || null,
      status: true,
      last_monthly_inspection: null,
      created_at: new Date().toISOString()
    };
    if (shouldShowHydroDue(assetType)) {
      assetData.hydro_due = hydroDue || null;
    }
    // Add to Firestore with provided assetId as doc ID
    await db.collection('clients').doc(currentClientId).collection('assets').doc(assetId).set(assetData);
    // Update local state
    assetData.id = assetId;
    allAssets.push(assetData);
    if (!assetTypeStats[assetType]) {
      assetTypeStats[assetType] = { total: 0, failed: 0 };
    }
    assetTypeStats[assetType].total++;
    document.getElementById('add-asset-modal').classList.remove('active');
    if (currentAssetType === assetType) {
      filteredAssets = allAssets.filter(asset => asset.type === assetType);
      renderAssetCards();
      document.getElementById('total-count').textContent = filteredAssets.length;
    } else {
      renderAssetTypeCards();
    }
    updateStats();
    showToast('Asset added successfully', { type: 'success' });
  } catch (error) {
    console.error('Error adding asset:', error);
    showToast('Error adding asset', { type: 'error' });
  }
}

// ========== UPDATE STATS ==========
function updateStats() {
  let overdue = 0;
  let dueSoon = 0;
  let complete = 0;

  allAssets.forEach(asset => {
    const status = getAssetStatus(asset);
    if (status === 'overdue') overdue++;
    else if (status === 'due-soon') dueSoon++;
    else complete++;
  });

  document.getElementById('overdue-count').textContent = overdue;
  document.getElementById('due-soon-count').textContent = dueSoon;
  document.getElementById('complete-count').textContent = complete;
}

function getAssetStatus(asset) {
  // Simple status logic based on monthly inspection
  const monthlyStatus = getMonthlyInspectionStatus(asset.last_monthly_inspection);
  return monthlyStatus.indicator;
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  // Back button
  document.getElementById('back-to-types-btn').addEventListener('click', backToTypes);
  
  // Modal close buttons
  document.getElementById('asset-detail-close').addEventListener('click', () => {
    document.getElementById('asset-detail-modal').classList.remove('active');
  });
  
  document.getElementById('add-asset-modal-close').addEventListener('click', () => {
    document.getElementById('add-asset-modal').classList.remove('active');
  });
  
  // Search and sort
  setupSearchAndSort();
  
  // Add asset buttons
  document.getElementById('add-asset-btn').addEventListener('click', showAddAssetModal);
  document.getElementById('add-asset-btn-main').addEventListener('click', showAddAssetModal);
}

// ========== UTILITY FUNCTIONS ==========
function showLoading(show) {
  document.getElementById('loading-spinner').style.display = show ? 'block' : 'none';
}

function showToast(message, options = {}) {
  const toast = document.createElement('div');
  toast.className = 'nexus-toast ' + (options.type || 'success');
  toast.innerHTML = `<span>${message}</span>`;
  document.getElementById('toast-area').appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
} 