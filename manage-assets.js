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
  window.normalizedAssetTypes = await fetchNormalizedAssetTypes();
  try {
    const assetsRef = db.collection('clients').doc(currentClientId).collection('assets');
    const snapshot = await assetsRef.get();
    snapshot.forEach(doc => {
      const asset = { id: doc.id, ...doc.data() };
      allAssets.push(asset);
    });
    // Build asset type statistics based on normalized types
    window.normalizedAssetTypes.forEach(type => {
      assetTypeStats[type] = { total: 0, failed: 0 };
    });
    allAssets.forEach(asset => {
      const normalized = formatAssetType(asset.type);
      if (!assetTypeStats[normalized]) {
        assetTypeStats[normalized] = { total: 0, failed: 0 };
      }
      assetTypeStats[normalized].total++;
      if (asset.status === false || asset.status === 'failed') {
        assetTypeStats[normalized].failed++;
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
  const assetTypes = window.normalizedAssetTypes || [];
  if (assetTypes.length === 0) {
    document.getElementById('no-assets-msg').style.display = 'block';
    return;
  }
  document.getElementById('no-assets-msg').style.display = 'none';
  assetTypes.forEach(assetType => {
    const stats = assetTypeStats[assetType] || { total: 0, failed: 0 };
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
  // Firestore does not support case-insensitive queries, so we must filter client-side
  // TODO: If Firestore adds case-insensitive queries, update this logic
  filteredAssets = allAssets.filter(asset => {
    return (asset.type || '').toLowerCase() === assetType.toLowerCase();
  });
  
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
async function fetchLocations() {
  const locations = [];
  try {
    const snapshot = await db.collection('clients').doc(currentClientId).collection('locations').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.level === 0) {
        locations.push({ id: doc.id, name: data.name, ...data });
      }
    });
  } catch (err) {
    console.error('Error fetching locations:', err);
  }
  return locations;
}

async function fetchSublocations(locationId) {
  const sublocations = [];
  try {
    const snapshot = await db.collection('clients').doc(currentClientId).collection('locations').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.level === 1 && data.parentId === locationId) {
        sublocations.push({ id: doc.id, name: data.name, ...data });
      }
    });
  } catch (err) {
    console.error('Error fetching sublocations:', err);
  }
  return sublocations;
}

function showAddAssetModal() {
  const content = document.getElementById('add-asset-modal-content');
  renderAddAssetForm(content);
  document.getElementById('add-asset-modal').classList.add('active');
  setupAddAssetFormListeners();
}

async function renderAddAssetForm(content) {
  // Fetch types and locations
  const types = await fetchNormalizedAssetTypes();
  const locations = await fetchLocations();
  // Build type options
  let typeOptions = types.map(type => `<option value="${type}">${type}</option>`).join('');
  typeOptions += '<option value="__custom__">+ Custom</option>';
  // Build location options
  let locationOptions = locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('');
  locationOptions += '<option value="__custom__">+ Custom</option>';
  content.innerHTML = `
    <form id="add-asset-form">
      <div style="margin-bottom: 1.5rem;">
        <label>Asset Type:</label>
        <select id="asset-type-select">${typeOptions}</select>
        <input type="text" id="custom-asset-type" placeholder="Enter custom asset type..." style="display:none; margin-top:0.5rem;" />
      </div>
      <div style="margin-bottom: 1.5rem;">
        <label>Asset ID:</label>
        <input type="text" id="asset-id" required />
      </div>
      <div style="margin-bottom: 1.5rem; display:none;" id="hydro-due-field">
        <label>Hydro Due (MM/YY):</label>
        <input type="month" id="hydro-due" />
      </div>
      <div style="margin-bottom: 1.5rem;">
        <label>Location:</label>
        <select id="location-select">${locationOptions}</select>
        <input type="text" id="custom-location" placeholder="Enter custom location..." style="display:none; margin-top:0.5rem;" />
      </div>
      <div style="margin-bottom: 1.5rem;">
        <label>SubLocation:</label>
        <select id="sublocation-select"><option value="">Select Location First</option></select>
        <input type="text" id="custom-sublocation" placeholder="Enter custom sublocation..." style="display:none; margin-top:0.5rem;" />
      </div>
      <div style="margin-bottom: 1.5rem;">
        <label>Serial Number (optional):</label>
        <input type="text" id="serial-no" />
      </div>
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button type="button" id="cancel-add-asset">Cancel</button>
        <button type="submit">Add Asset</button>
      </div>
    </form>
  `;
}

function setupAddAssetFormListeners() {
  const typeSelect = document.getElementById('asset-type-select');
  const customTypeInput = document.getElementById('custom-asset-type');
  const hydroDueField = document.getElementById('hydro-due-field');
  const locationSelect = document.getElementById('location-select');
  const customLocationInput = document.getElementById('custom-location');
  const sublocationSelect = document.getElementById('sublocation-select');
  const customSublocationInput = document.getElementById('custom-sublocation');
  const form = document.getElementById('add-asset-form');
  const cancelBtn = document.getElementById('cancel-add-asset');

  // Asset type custom logic
  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === '__custom__') {
      customTypeInput.style.display = 'block';
      customTypeInput.focus();
    } else {
      customTypeInput.style.display = 'none';
      customTypeInput.value = '';
    }
    updateHydroDueVisibility();
  });
  customTypeInput.addEventListener('input', updateHydroDueVisibility);
  function updateHydroDueVisibility() {
    let assetType = typeSelect.value === '__custom__' ? customTypeInput.value : typeSelect.value;
    if (shouldShowHydroDue(assetType)) {
      hydroDueField.style.display = 'block';
      document.getElementById('hydro-due').required = true;
    } else {
      hydroDueField.style.display = 'none';
      document.getElementById('hydro-due').required = false;
    }
  }
  // Location custom logic
  locationSelect.addEventListener('change', async () => {
    if (locationSelect.value === '__custom__') {
      customLocationInput.style.display = 'block';
      customLocationInput.focus();
      sublocationSelect.innerHTML = '<option value="">Enter custom location first</option>';
    } else {
      customLocationInput.style.display = 'none';
      customLocationInput.value = '';
      // Load sublocations for selected location
      const sublocations = await fetchSublocations(locationSelect.value);
      let subOptions = sublocations.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('');
      subOptions += '<option value="__custom__">+ Custom</option>';
      sublocationSelect.innerHTML = subOptions || '<option value="">No sublocations found</option>';
    }
  });
  // Sublocation custom logic
  sublocationSelect.addEventListener('change', () => {
    if (sublocationSelect.value === '__custom__') {
      customSublocationInput.style.display = 'block';
      customSublocationInput.focus();
    } else {
      customSublocationInput.style.display = 'none';
      customSublocationInput.value = '';
    }
  });
  // Cancel button
  cancelBtn.addEventListener('click', () => {
    document.getElementById('add-asset-modal').classList.remove('active');
  });
  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addAsset();
  });
  // Initial hydro due visibility
  updateHydroDueVisibility();
}

async function addAsset() {
  try {
    const typeSelect = document.getElementById('asset-type-select');
    const customTypeInput = document.getElementById('custom-asset-type');
    const assetId = document.getElementById('asset-id').value.trim();
    let assetType = typeSelect.value === '__custom__' ? customTypeInput.value.trim() : typeSelect.value;
    if (!assetType || !assetId) {
      showToast('Asset type and ID are required', { type: 'error' });
      return;
    }
    // Update types_in_use if custom type
    if (typeSelect.value === '__custom__' && assetType) {
      const typesDocRef = db.collection('clients').doc(currentClientId).collection('asset_types').doc('types_in_use');
      const typesDoc = await typesDocRef.get();
      let names = (typesDoc.exists && typesDoc.data().name) ? typesDoc.data().name : [];
      if (!names.map(n => n.toLowerCase()).includes(assetType.toLowerCase())) {
        names.push(assetType);
        await typesDocRef.set({ name: names }, { merge: true });
      }
    }
    // Hydro Due
    const hydroDue = shouldShowHydroDue(assetType) ? document.getElementById('hydro-due').value : null;
    // Location
    const locationSelect = document.getElementById('location-select');
    const customLocationInput = document.getElementById('custom-location');
    let locationId = locationSelect.value;
    let locationName = '';
    if (locationId === '__custom__') {
      locationName = customLocationInput.value.trim();
      if (!locationName) {
        showToast('Location is required', { type: 'error' });
        return;
      }
      // Add new location to Firestore
      const newLocRef = db.collection('clients').doc(currentClientId).collection('locations').doc();
      await newLocRef.set({ name: locationName, level: 0, created: new Date().toISOString() });
      locationId = newLocRef.id;
    } else {
      locationName = locationSelect.options[locationSelect.selectedIndex].text;
    }
    // Sublocation
    const sublocationSelect = document.getElementById('sublocation-select');
    const customSublocationInput = document.getElementById('custom-sublocation');
    let sublocationId = sublocationSelect.value;
    let sublocationName = '';
    if (sublocationId === '__custom__') {
      sublocationName = customSublocationInput.value.trim();
      if (!sublocationName) {
        showToast('Sublocation is required', { type: 'error' });
        return;
      }
      // Add new sublocation to Firestore
      const newSubRef = db.collection('clients').doc(currentClientId).collection('locations').doc();
      await newSubRef.set({ name: sublocationName, level: 1, parentId: locationId, created: new Date().toISOString() });
      sublocationId = newSubRef.id;
    } else {
      sublocationName = sublocationSelect.options[sublocationSelect.selectedIndex] ? sublocationSelect.options[sublocationSelect.selectedIndex].text : '';
    }
    // Serial number
    const serialNo = document.getElementById('serial-no').value.trim();
    // Created by
    const createdBy = sessionStorage.getItem('username') || 'unknown'; // TODO: Use SessionData() if available
    // Build asset data
    const assetData = {
      type: assetType,
      id: assetId,
      location_id: locationId,
      location_name: locationName,
      sublocation_id: sublocationId,
      sublocation_name: sublocationName,
      status: true,
      last_monthly_inspection: null,
      created_at: new Date().toISOString(),
      created_by: createdBy
    };
    if (shouldShowHydroDue(assetType)) {
      assetData.hydro_due = hydroDue || null;
    }
    if (serialNo) {
      assetData.serial_no = serialNo;
    }
    // Add to Firestore with provided assetId as doc ID
    await db.collection('clients').doc(currentClientId).collection('assets').doc(assetId).set(assetData);
    // Update local state and UI
    assetData.id = assetId;
    allAssets.push(assetData);
    if (!assetTypeStats[assetType]) {
      assetTypeStats[assetType] = { total: 0, failed: 0 };
    }
    assetTypeStats[assetType].total++;
    document.getElementById('add-asset-modal').classList.remove('active');
    renderAssetTypeCards();
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
  const backBtn = document.getElementById('back-to-types-btn');
  if (backBtn) {
    backBtn.addEventListener('click', backToTypes);
  }
  // Modal close buttons
  const assetDetailClose = document.getElementById('asset-detail-close');
  if (assetDetailClose) {
    assetDetailClose.addEventListener('click', () => {
      document.getElementById('asset-detail-modal').classList.remove('active');
    });
  }
  const addAssetModalClose = document.getElementById('add-asset-modal-close');
  if (addAssetModalClose) {
    addAssetModalClose.addEventListener('click', () => {
      document.getElementById('add-asset-modal').classList.remove('active');
    });
  }
  
  // Add Asset Modal: Click outside to close
  const addAssetModalOverlay = document.getElementById('add-asset-modal');
  if (addAssetModalOverlay) {
    addAssetModalOverlay.addEventListener('click', (e) => {
      // Only close if clicking the overlay itself, not the modal content
      if (e.target === addAssetModalOverlay) {
        addAssetModalOverlay.classList.remove('active');
      }
    });
  }
  // Search and sort
  setupSearchAndSort();
  // Add asset buttons
  const addAssetBtn = document.getElementById('add-asset-btn');
  if (addAssetBtn) {
    addAssetBtn.addEventListener('click', showAddAssetModal);
  }
  const addAssetBtnMain = document.getElementById('add-asset-btn-main');
  if (addAssetBtnMain) {
    addAssetBtnMain.addEventListener('click', showAddAssetModal);
  }
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

// Utility: Fetch asset types from Firestore and normalize/deduplicate
async function fetchNormalizedAssetTypes() {
  const typesSet = new Map();
  try {
    const typesDoc = await db.collection('clients').doc(currentClientId).collection('asset_types').doc('types_in_use').get();
    const names = (typesDoc.exists && typesDoc.data().name) ? typesDoc.data().name : [];
    names.forEach(type => {
      const normalized = formatAssetType(type);
      typesSet.set(normalized.toLowerCase(), normalized);
    });
  } catch (err) {
    console.error('Error fetching asset types:', err);
  }
  return Array.from(typesSet.values());
} 