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

// Convert text to slug format (e.g., "SCBA Cylinder" → "scba_cylinder")
function createSlug(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

// Format Hydro Due Date as MM/YYYY
function formatHydroDue(hydroDue) {
  if (!hydroDue) return 'Not set';
  try {
    const date = new Date(hydroDue);
    if (isNaN(date.getTime())) return 'Invalid date';
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${yyyy}`;
  } catch {
    return 'Invalid date';
  }
}

// Pretty casing for asset types (for display purposes)
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

// Format asset type to pretty display format (for custom types)
function formatAssetTypePretty(text) {
  if (!text) return '';
  return text
    .trim()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Enhanced hydro due logic - check for extinguisher, cylinder, scba in slug or pretty format
function shouldShowHydroDue(assetType) {
  if (!assetType) return false;
  const type = assetType.toString().toLowerCase();
  const slug = createSlug(type);
  const pretty = formatAssetType(type);
  
  // Check for keywords in both slug and pretty format
  const keywords = ['extinguisher', 'cylinder', 'scba'];
  return keywords.some(keyword => 
    type.includes(keyword) || 
    slug.includes(keyword) || 
    pretty.toLowerCase().includes(keyword)
  );
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

// Location document ID formatting (prettified for Firestore, no slugging)
function formatLocationDocId(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
    .replace(/[\/\.\[\]#]/g, '') // Remove invalid characters but keep spaces
    .replace(/\s+/g, ' ') // Collapse spaces again after character removal
    .trim(); // Trim leading/trailing spaces
}

// Get client code pattern settings
async function getClientCodePattern() {
  try {
    const clientDoc = await db.collection('clients').doc(currentClientId).get();
    if (clientDoc.exists) {
      const clientData = clientDoc.data();
      return clientData.codePattern || {
        prefix: 'LOC',
        length: 6,
        numeric: true,
        separator: '-'
      };
    }
  } catch (error) {
    console.error('Error fetching client code pattern:', error);
  }
  
  // Default pattern if none exists
  return {
    prefix: 'LOC',
    length: 6,
    numeric: true,
    separator: '-'
  };
}

// Generate unique code for location/sublocation
async function generateUniqueCode(level = 0, parentId = null) {
  try {
    const pattern = await getClientCodePattern();
    const locations = await fetchLocations();
    
    // Get existing codes at this level
    let existingCodes = locations
      .filter(loc => loc.level === level)
      .map(loc => loc.code)
      .filter(code => code && code.startsWith(pattern.prefix));
    
    // For sublocations (level 1), only consider codes from the same parent location
    if (level === 1 && parentId) {
      existingCodes = locations
        .filter(loc => loc.level === level && loc.parentId === parentId)
        .map(loc => loc.code)
        .filter(code => code && code.startsWith(pattern.prefix));
    }
    
    // Find the highest numeric value
    let maxNumber = 0;
    existingCodes.forEach(code => {
      const match = code.match(new RegExp(`${pattern.prefix}${pattern.separator}(\\d+)`));
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    });
    
    // Generate next code
    const nextNumber = maxNumber + 1;
    const numericPart = nextNumber.toString().padStart(pattern.length - pattern.prefix.length - pattern.separator.length, '0');
    
    return `${pattern.prefix}${pattern.separator}${numericPart}`;
  } catch (error) {
    console.error('Error generating unique code:', error);
    // Fallback code
    return `LOC-${Date.now().toString().slice(-4)}`;
  }
}

// Check if location document ID is unique
async function isLocationDocIdUnique(docId, level = 0, parentId = null) {
  try {
    const locations = await fetchLocations();
    
    // For level 0 (locations), check against all level 0 locations
    if (level === 0) {
      return !locations.some(loc => loc.id === docId && loc.level === 0);
    }
    
    // For level 1 (sublocations), check against all level 1 locations with the same parent
    if (level === 1) {
      return !locations.some(loc => loc.id === docId && loc.level === 1 && loc.parentId === parentId);
    }
    
    return true;
  } catch (error) {
    console.error('Error checking location doc ID uniqueness:', error);
    return false;
  }
}

// Save client code pattern
async function saveClientCodePattern(pattern) {
  try {
    await db.collection('clients').doc(currentClientId).update({
      codePattern: pattern
    });
    console.log('Client code pattern saved:', pattern);
  } catch (error) {
    console.error('Error saving client code pattern:', error);
    throw error;
  }
}

// Prompt for first sublocation after creating a new location
async function promptForFirstSublocation(locationId, locationName) {
  try {
    const sublocationName = prompt(`Please enter the first sublocation for "${locationName}":`);
    if (sublocationName && sublocationName.trim()) {
      const newSublocation = await addSublocationToLocation(locationId, sublocationName.trim());
      showToast(`First sublocation "${sublocationName}" created successfully!`, { type: 'success' });
      return newSublocation;
    }
  } catch (error) {
    console.error('Error creating first sublocation:', error);
    showToast('Error creating first sublocation. You can add it later.', { type: 'error' });
  }
  return null;
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
    
    <button class="move-asset-btn" onclick="showMoveAssetModal('${asset.id}')" title="Move Asset">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 9l3 3-3 3m5 0h3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
      Move
    </button>
  `;

  card.addEventListener('click', (e) => {
    // Don't trigger asset details if clicking the move button
    if (e.target.closest('.move-asset-btn')) {
      return;
    }
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
      // Only include documents with valid name property and level 0 (top-level locations)
      if (data.name && data.name.trim() && (data.level === 0 || data.level === undefined)) {
        locations.push({ id: doc.id, name: data.name.trim(), ...data });
      }
    });
    
    // If no locations found, log a helpful message
    if (locations.length === 0) {
      console.warn('No valid locations found for client. User may need to complete onboarding or create locations.');
    }
  } catch (err) {
    console.error('Error fetching locations:', err);
  }
  return locations;
}

async function fetchSublocations(locationId) {
  const sublocations = [];
  try {
    // Fetch all sublocation documents that belong to this parent location
    const snapshot = await db.collection('clients').doc(currentClientId).collection('locations').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only include documents with valid name property, level 1, and matching parentId
      if (data.name && data.name.trim() && data.level === 1 && data.parentId === locationId) {
        sublocations.push({
          id: doc.id, // Use the document ID
          name: data.name.trim(),
          code: data.code,
          ...data
        });
      }
    });
  } catch (err) {
    console.error('Error fetching sublocations:', err);
  }
  return sublocations;
}

async function createLocation(name, level = 0, parentId = null) {
  try {
    // Format the name for use as document ID
    const docId = formatLocationDocId(name);
    
    // Check if document ID is unique at this level
    const isUnique = await isLocationDocIdUnique(docId, level, parentId);
    if (!isUnique) {
      throw new Error(`A location with the name "${name}" already exists at this level`);
    }
    
    // Generate unique code for this location
    const code = await generateUniqueCode(level, parentId);
    
    // Create location data
    const locationData = {
      name: name.trim(),
      code: code,
      level: level,
      created: new Date().toISOString(),
      ...(parentId && { parentId: parentId })
    };
    
    // Create document with prettified ID
    const docRef = db.collection('clients').doc(currentClientId).collection('locations').doc(docId);
    await docRef.set(locationData);
    
    console.log(`Created location: ${name} with ID: ${docId} and code: ${code}`);
    
    // Log for audit
    console.log(`Location creation logged - Name: ${name}, DocID: ${docId}, Code: ${code}, Level: ${level}, Created: ${new Date().toISOString()}`);
    
    return { id: docId, name: name.trim(), code: code, ...locationData };
  } catch (error) {
    console.error('Error creating location:', error);
    throw error;
  }
}

async function addSublocationToLocation(locationId, sublocationName) {
  try {
    // Format the sublocation name for use as document ID (prettified, not slugged)
    const sublocationDocId = formatLocationDocId(sublocationName);
    
    // Check if sublocation document ID is unique at level 1 within this parent location
    const isUnique = await isLocationDocIdUnique(sublocationDocId, 1, locationId);
    if (!isUnique) {
      throw new Error(`A sublocation with the name "${sublocationName}" already exists in this location`);
    }
    
    // Generate unique code for this sublocation (level 1) within this parent location
    const code = await generateUniqueCode(1, locationId);
    
    // Create the sublocation data
    const sublocationData = {
      name: sublocationName.trim(),
      code: code,
      level: 1,
      parentId: locationId,
      created: new Date().toISOString()
    };
    
    // Create sublocation as a separate document with prettified ID
    const sublocationRef = db.collection('clients').doc(currentClientId).collection('locations').doc(sublocationDocId);
    await sublocationRef.set(sublocationData);
    
    console.log(`Added sublocation: ${sublocationName} with ID: ${sublocationDocId} and code: ${code} to location: ${locationId}`);
    
    // Log for audit
    console.log(`Sublocation creation logged - Name: ${sublocationName}, DocID: ${sublocationDocId}, Code: ${code}, Parent: ${locationId}, Created: ${new Date().toISOString()}`);
    
    return { id: sublocationDocId, name: sublocationName.trim(), code: code, ...sublocationData };
  } catch (error) {
    console.error('Error adding sublocation to location:', error);
    throw error;
  }
}

async function refreshLocationDropdown(locationSelect, includeCustomOption = true) {
  try {
    const locations = await fetchLocations();
    let locationOptions = '';
    
    if (locations.length > 0) {
      locationOptions = locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('');
      if (includeCustomOption) {
        locationOptions += '<option value="__custom__">+ Add Custom Location</option>';
      }
    } else {
      locationOptions = '<option value="" disabled>No locations found</option>';
      if (includeCustomOption) {
        locationOptions += '<option value="__custom__">+ Add Custom Location</option>';
      }
    }
    
    locationSelect.innerHTML = locationOptions;
    return locations;
  } catch (error) {
    console.error('Error refreshing location dropdown:', error);
    locationSelect.innerHTML = '<option value="">Error loading locations</option>';
  }
}

async function refreshSublocationDropdown(sublocationSelect, locationId, includeCustomOption = true) {
  try {
    const sublocations = await fetchSublocations(locationId);
    let subOptions = '';
    
    if (sublocations.length > 0) {
      subOptions = sublocations.map(sub => `<option value="${sub.id}">${sub.name}</option>`).join('');
      if (includeCustomOption) {
        subOptions += '<option value="__custom__">+ Add Custom Sub-Location</option>';
      }
    } else {
      // Don't show "No sub-locations found" as a selectable option - just show the custom option
      if (includeCustomOption) {
        subOptions = '<option value="__custom__">+ Add Custom Sub-Location</option>';
      }
    }
    
    sublocationSelect.innerHTML = subOptions;
    return sublocations;
  } catch (error) {
    console.error('Error refreshing sublocation dropdown:', error);
    sublocationSelect.innerHTML = '<option value="">Error loading sub-locations</option>';
  }
}

async function showAddAssetModal() {
  const content = document.getElementById('add-asset-modal-content');
  document.getElementById('add-asset-modal').classList.add('active');
  
  try {
    await renderAddAssetForm(content);
    setupAddAssetFormListeners();
  } catch (error) {
    console.error('Error rendering add asset form:', error);
    showToast('Error loading asset form. Please try again.', { type: 'error' });
    document.getElementById('add-asset-modal').classList.remove('active');
  }
}

async function renderAddAssetForm(content) {
  // Fetch types and locations
  const types = await fetchNormalizedAssetTypes();
  const locations = await fetchLocations();
  
  // Build type options
  let typeOptions = types.map(type => `<option value="${type}">${type}</option>`).join('');
  typeOptions += '<option value="__custom__">+ Add Custom Type</option>';
  
  // Build location options with fallback for empty locations
  let locationOptions = '';
  if (locations.length > 0) {
    locationOptions = locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('');
    locationOptions += '<option value="__custom__">+ Add Custom Location</option>';
  } else {
    locationOptions = '<option value="">No locations found. Please add a location first.</option>';
    locationOptions += '<option value="__custom__">+ Add Custom Location</option>';
  }
  
  content.innerHTML = `
    <form id="add-asset-form">
      <!-- Asset Information Section -->
      <div class="form-section">
        <div class="form-section-title">
          Asset Information
        </div>
        
        <div class="form-group">
          <label for="asset-type-select" class="required-field">Asset Type</label>
          <select id="asset-type-select" required>
            <option value="">Select Asset Type</option>
            ${typeOptions}
          </select>
          <div id="custom-type-container" class="custom-input" style="display:none;">
            <input type="text" id="custom-asset-type" placeholder="Enter custom asset type..." />
            <div id="slug-preview" class="slug-preview"></div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="sub-type" class="required-field">Sub Type</label>
          <input type="text" id="sub-type" placeholder="What kind of Asset Type?" required />
        </div>
        
        <div class="form-group">
          <label for="asset-id" class="required-field">Asset ID</label>
          <input type="text" id="asset-id" placeholder="Enter unique asset identifier" required />
        </div>
        
        <div class="form-group" id="hydro-due-field" style="display:none;">
          <label for="hydro-due" class="required-field">Hydrostatic Test Due Date</label>
          <input type="month" id="hydro-due" placeholder="MM/YYYY" />
        </div>
        
        <div class="form-group">
          <label for="serial-no">Serial Number</label>
          <input type="text" id="serial-no" placeholder="Enter serial number (optional)" />
        </div>
      </div>
      
      <!-- Location Information Section -->
      <div class="form-section">
        <div class="form-section-title">
          Location Information
        </div>
        
        <div class="form-group">
          <label for="location-select" class="required-field">Location</label>
          <select id="location-select" required>
            <option value="">Select Location</option>
            ${locationOptions}
          </select>
          <input type="text" id="custom-location" placeholder="Enter custom location name..." class="custom-input" style="display:none;" />
        </div>
        
        <div class="form-group">
          <label for="sublocation-select" class="required-field">Sub-Location</label>
          <select id="sublocation-select" required>
            <option value="">Select Location First</option>
          </select>
          <input type="text" id="custom-sublocation" placeholder="Enter custom sub-location name..." class="custom-input" style="display:none;" />
        </div>
      </div>
      
      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" id="cancel-add-asset" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Cancel
        </button>
        <button type="submit" id="submit-add-asset" class="btn btn-primary" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Asset
        </button>
      </div>
    </form>
  `;
}

function setupAddAssetFormListeners() {
  // Get all required elements with defensive checks
  const typeSelect = document.getElementById('asset-type-select');
  const customTypeContainer = document.getElementById('custom-type-container');
  const customTypeInput = document.getElementById('custom-asset-type');
  const slugPreview = document.getElementById('slug-preview');
  const subTypeInput = document.getElementById('sub-type');
  const hydroDueField = document.getElementById('hydro-due-field');
  const locationSelect = document.getElementById('location-select');
  const customLocationInput = document.getElementById('custom-location');
  const sublocationSelect = document.getElementById('sublocation-select');
  const customSublocationInput = document.getElementById('custom-sublocation');
  const form = document.getElementById('add-asset-form');
  const cancelBtn = document.getElementById('cancel-add-asset');
  const submitBtn = document.getElementById('submit-add-asset');
  const assetIdInput = document.getElementById('asset-id');
  const serialNoInput = document.getElementById('serial-no');

  // Verify all critical elements exist
  const requiredElements = {
    'asset-type-select': typeSelect,
    'sub-type': subTypeInput,
    'asset-id': assetIdInput,
    'location-select': locationSelect,
    'sublocation-select': sublocationSelect,
    'add-asset-form': form,
    'cancel-add-asset': cancelBtn,
    'submit-add-asset': submitBtn
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([id, element]) => !element)
    .map(([id]) => id);

  if (missingElements.length > 0) {
    console.error('Missing required form elements:', missingElements);
    console.error('Form may not have rendered properly. Cannot setup listeners.');
    return;
  }

  // Form validation state
  let formState = {
    assetType: { valid: false, value: '' },
    subType: { valid: false, value: '' },
    assetId: { valid: false, value: '' },
    location: { valid: false, value: '' },
    sublocation: { valid: false, value: '' },
    hydroDue: { valid: true, value: '' }
  };

  // Validation functions
  function validateField(fieldName, value) {
    switch (fieldName) {
      case 'assetType':
        return value && value.trim().length > 0;
      case 'subType':
        return value && value.trim().length > 0;
      case 'assetId':
        return value && value.trim().length > 0;
      case 'location':
        return value && value !== '';
      case 'sublocation':
        return value && value !== '';
      case 'hydroDue':
        return !shouldShowHydroDue(formState.assetType.value) || (value && value.trim().length > 0);
      default:
        return true;
    }
  }

  function updateFieldState(fieldName, value) {
    formState[fieldName] = { valid: validateField(fieldName, value), value: value };
    updateSubmitButton();
    updateFieldValidation(fieldName);
  }

  function updateSubmitButton() {
    const allValid = Object.values(formState).every(field => field.valid);
    submitBtn.disabled = !allValid;
  }

  function updateFieldValidation(fieldName) {
    const field = formState[fieldName];
    const inputElement = document.getElementById(getInputId(fieldName));
    
    if (!inputElement) {
      console.warn(`Input element for field '${fieldName}' not found`);
      return;
    }
    
    // Remove existing validation classes
    inputElement.classList.remove('field-error', 'field-success');
    
    // Add appropriate validation class
    if (field.value && field.valid) {
      inputElement.classList.add('field-success');
    } else if (field.value && !field.valid) {
      inputElement.classList.add('field-error');
    }
  }

  function getInputId(fieldName) {
    const idMap = {
      'assetType': 'asset-type-select',
      'subType': 'sub-type',
      'assetId': 'asset-id',
      'location': 'location-select',
      'sublocation': 'sublocation-select',
      'hydroDue': 'hydro-due'
    };
    return idMap[fieldName];
  }

  // Update sub-type placeholder based on asset type
  function updateSubTypePlaceholder(assetType) {
    if (!subTypeInput) return;
    
    if (!assetType) {
      subTypeInput.placeholder = 'What kind of Asset Type?';
      return;
    }
    
    const prettyType = formatAssetTypePretty(assetType) || formatAssetType(assetType);
    subTypeInput.placeholder = `What kind of ${prettyType}?`;
  }

  // Asset type custom logic with slug preview
  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === '__custom__') {
      if (customTypeContainer) customTypeContainer.style.display = 'block';
      if (customTypeInput) customTypeInput.focus();
      updateFieldState('assetType', '');
      updateSubTypePlaceholder('');
    } else {
      if (customTypeContainer) customTypeContainer.style.display = 'none';
      if (customTypeInput) customTypeInput.value = '';
      if (slugPreview) {
        slugPreview.textContent = '';
        slugPreview.classList.remove('has-content');
      }
      updateFieldState('assetType', typeSelect.value);
      updateSubTypePlaceholder(typeSelect.value);
    }
    updateHydroDueVisibility();
  });

  // Custom type input with slug preview
  if (customTypeInput) {
    customTypeInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      updateFieldState('assetType', value);
      updateSubTypePlaceholder(value);
      updateHydroDueVisibility();
      
      // Update slug preview
      if (value && slugPreview) {
        const slug = createSlug(value);
        slugPreview.textContent = `Slug: ${slug}`;
        slugPreview.classList.add('has-content');
      } else if (slugPreview) {
        slugPreview.textContent = '';
        slugPreview.classList.remove('has-content');
      }
    });
  }

  // Sub-type input validation
  subTypeInput.addEventListener('input', (e) => {
    updateFieldState('subType', e.target.value);
  });

  function updateHydroDueVisibility() {
    let assetType = typeSelect.value === '__custom__' ? (customTypeInput ? customTypeInput.value : '') : typeSelect.value;
    if (shouldShowHydroDue(assetType)) {
      if (hydroDueField) hydroDueField.style.display = 'block';
      const hydroDueInput = document.getElementById('hydro-due');
      if (hydroDueInput) {
        hydroDueInput.required = true;
        updateFieldState('hydroDue', hydroDueInput.value);
      }
    } else {
      if (hydroDueField) hydroDueField.style.display = 'none';
      const hydroDueInput = document.getElementById('hydro-due');
      if (hydroDueInput) {
        hydroDueInput.required = false;
        updateFieldState('hydroDue', '');
      }
    }
  }

  // Asset ID validation
  assetIdInput.addEventListener('input', (e) => {
    updateFieldState('assetId', e.target.value);
  });

  // Serial number (optional)
  serialNoInput.addEventListener('input', (e) => {
    // Serial number is optional, no validation needed
  });

  // Location custom logic
  locationSelect.addEventListener('change', async () => {
    if (locationSelect.value === '__custom__') {
      if (customLocationInput) customLocationInput.style.display = 'block';
      if (customLocationInput) customLocationInput.focus();
      sublocationSelect.innerHTML = '<option value="">Enter custom location first</option>';
      updateFieldState('location', '');
      updateFieldState('sublocation', '');
    } else {
      if (customLocationInput) customLocationInput.style.display = 'none';
      if (customLocationInput) customLocationInput.value = '';
      updateFieldState('location', locationSelect.value);
      
      // Load sublocations for selected location
      try {
        await refreshSublocationDropdown(sublocationSelect, locationSelect.value);
        updateFieldState('sublocation', '');
      } catch (error) {
        console.error('Error loading sublocations:', error);
        sublocationSelect.innerHTML = '<option value="">Error loading sub-locations</option>';
      }
    }
  });

  if (customLocationInput) {
    customLocationInput.addEventListener('input', (e) => {
      updateFieldState('location', e.target.value);
    });
    
    // Create location when user presses Enter or loses focus
    customLocationInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && customLocationInput.value.trim()) {
        e.preventDefault();
        await createCustomLocation();
      }
    });
    
    customLocationInput.addEventListener('blur', async () => {
      if (customLocationInput.value.trim()) {
        await createCustomLocation();
      }
    });
  }

  // Helper function to create custom location
  async function createCustomLocation() {
    if (!customLocationInput || !customLocationInput.value.trim()) return;
    
    try {
      const locationName = customLocationInput.value.trim();
      const newLocation = await createLocation(locationName, 0);
      
      // Refresh location dropdown and select the new location
      await refreshLocationDropdown(locationSelect);
      locationSelect.value = newLocation.id;
      
      // Hide custom input and update form state
      customLocationInput.style.display = 'none';
      customLocationInput.value = '';
      updateFieldState('location', newLocation.id);
      
      // Load sublocations for the new location
      await refreshSublocationDropdown(sublocationSelect, newLocation.id);
      updateFieldState('sublocation', '');
      
      showToast(`Location "${locationName}" created successfully!`, { type: 'success' });
      
      // Prompt for first sublocation
      await promptForFirstSublocation(newLocation.id, locationName);
      
      // Refresh sublocation dropdown again to show the new sublocation
      await refreshSublocationDropdown(sublocationSelect, newLocation.id);
    } catch (error) {
      console.error('Error creating custom location:', error);
      showToast('Error creating location. Please try again.', { type: 'error' });
    }
  }

  // Helper function to create custom sublocation
  async function createCustomSublocation() {
    if (!customSublocationInput || !customSublocationInput.value.trim() || !locationSelect.value || locationSelect.value === '__custom__') return;
    
    try {
      const sublocationName = customSublocationInput.value.trim();
      
      // Validate sublocation name
      if (sublocationName.length < 2) {
        showToast('Sub-location name must be at least 2 characters long.', { type: 'error' });
        return;
      }
      
      const newSublocation = await addSublocationToLocation(locationSelect.value, sublocationName);
      
      // Refresh sublocation dropdown and select the new sublocation
      await refreshSublocationDropdown(sublocationSelect, locationSelect.value);
      sublocationSelect.value = newSublocation.id;
      
      // Hide custom input and update form state
      customSublocationInput.style.display = 'none';
      customSublocationInput.value = '';
      updateFieldState('sublocation', newSublocation.id);
      
      showToast(`Sub-location "${sublocationName}" created successfully!`, { type: 'success' });
    } catch (error) {
      console.error('Error creating custom sublocation:', error);
      showToast(error.message || 'Error creating sub-location. Please try again.', { type: 'error' });
    }
  }

  // Sublocation custom logic
  sublocationSelect.addEventListener('change', () => {
    if (sublocationSelect.value === '__custom__') {
      if (customSublocationInput) {
        customSublocationInput.style.display = 'block';
        customSublocationInput.focus();
      }
      updateFieldState('sublocation', '');
    } else {
      if (customSublocationInput) {
        customSublocationInput.style.display = 'none';
        customSublocationInput.value = '';
      }
      updateFieldState('sublocation', sublocationSelect.value);
    }
  });

  if (customSublocationInput) {
    customSublocationInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      updateFieldState('sublocation', value);
    });
    
    // Create sublocation when user presses Enter or loses focus
    customSublocationInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && customSublocationInput.value.trim()) {
        e.preventDefault();
        await createCustomSublocation();
      }
    });
    
    customSublocationInput.addEventListener('blur', async () => {
      if (customSublocationInput.value.trim()) {
        await createCustomSublocation();
      }
    });
  }

  // Hydro due validation
  const hydroDueInput = document.getElementById('hydro-due');
  if (hydroDueInput) {
    hydroDueInput.addEventListener('input', (e) => {
      updateFieldState('hydroDue', e.target.value);
    });
  }

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    document.getElementById('add-asset-modal').classList.remove('active');
  });

  // Form submit with loading state
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    showModalLoading(true);
    
    try {
      await addAsset();
      showModalSuccess();
    } catch (error) {
      console.error('Error adding asset:', error);
      showToast('Error adding asset. Please try again.', { type: 'error' });
    } finally {
      showModalLoading(false);
    }
  });

  // Initial setup
  updateHydroDueVisibility();
  updateSubmitButton();
}

// Modal loading state management
function showModalLoading(show) {
  const modal = document.getElementById('add-asset-modal');
  
  if (show) {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <div class="loading-spinner"></div>
        <div class="loading-text">Adding Asset...</div>
      </div>
    `;
    modal.querySelector('.modal').appendChild(loadingOverlay);
  } else {
    const loadingOverlay = modal.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }
}

// Modal success state
function showModalSuccess() {
  const content = document.getElementById('add-asset-modal-content');
  content.innerHTML = `
    <div class="success-state">
      <div class="success-icon">✓</div>
      <div class="success-title">Asset Added Successfully!</div>
      <div class="success-message">The asset has been created and is now available in your asset management system.</div>
      <button type="button" class="btn btn-primary" onclick="closeAddAssetModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M5 13l4 4L19 7"/>
        </svg>
        Continue
      </button>
    </div>
  `;
}

// Close modal function
function closeAddAssetModal() {
  const modal = document.getElementById('add-asset-modal');
  if (modal) {
    modal.classList.remove('active');
    // Reset modal content
    const content = document.getElementById('add-asset-modal-content');
    if (content) content.innerHTML = '';
    // Remove loading overlays
    const loadingOverlay = modal.querySelector('.loading-overlay');
    if (loadingOverlay) loadingOverlay.remove();
  }
}

async function addAsset() {
  try {
    const typeSelect = document.getElementById('asset-type-select');
    const customTypeInput = document.getElementById('custom-asset-type');
    const subTypeInput = document.getElementById('sub-type');
    const assetId = document.getElementById('asset-id').value.trim();
    const subType = subTypeInput.value.trim();
    
    let assetType = typeSelect.value === '__custom__' ? customTypeInput.value.trim() : typeSelect.value;
    
    // Validate required fields
    if (!assetType || !assetId || !subType) {
      throw new Error('Asset type, sub-type, and ID are required');
    }

    // Check if asset ID already exists
    const existingAsset = allAssets.find(asset => asset.id === assetId);
    if (existingAsset) {
      throw new Error(`Asset with ID "${assetId}" already exists`);
    }

    // Handle custom asset type formatting
    let prettyType = assetType;
    let slugType = assetType;
    
    if (typeSelect.value === '__custom__') {
      // Format custom type properly
      prettyType = formatAssetTypePretty(assetType);
      slugType = createSlug(assetType);
      
      if (!prettyType || !slugType) {
        throw new Error('Invalid asset type format');
      }
      
      // Update types_in_use if custom type (use pretty format for display)
      const typesDocRef = db.collection('clients').doc(currentClientId).collection('asset_types').doc('types_in_use');
      const typesDoc = await typesDocRef.get();
      let names = (typesDoc.exists && typesDoc.data().name) ? typesDoc.data().name : [];
      if (!names.map(n => n.toLowerCase()).includes(prettyType.toLowerCase())) {
        names.push(prettyType);
        await typesDocRef.set({ name: names }, { merge: true });
      }
    }

    // Hydro Due validation
    const hydroDue = shouldShowHydroDue(assetType) ? document.getElementById('hydro-due').value : null;
    if (shouldShowHydroDue(assetType) && !hydroDue) {
      throw new Error('Hydrostatic test due date is required for this asset type');
    }

    // Location
    const locationSelect = document.getElementById('location-select');
    const customLocationInput = document.getElementById('custom-location');
    let locationId = locationSelect.value;
    let locationName = '';
    
    if (locationId === '__custom__') {
      locationName = customLocationInput.value.trim();
      if (!locationName) {
        throw new Error('Location is required');
      }
      // Create new location using the new function with prettified doc ID
      const newLocation = await createLocation(locationName, 0);
      locationId = newLocation.id;
      locationName = newLocation.name;
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
        throw new Error('Sub-location is required');
      }
      // Create new sublocation using the new function with prettified doc ID
      const newSublocation = await addSublocationToLocation(locationId, sublocationName);
      sublocationId = newSublocation.id;
      sublocationName = newSublocation.name;
    } else {
      sublocationName = sublocationSelect.options[sublocationSelect.selectedIndex] ? 
        sublocationSelect.options[sublocationSelect.selectedIndex].text : '';
    }

    // Serial number
    const serialNo = document.getElementById('serial-no').value.trim();
    
    // Created by
    const createdBy = sessionStorage.getItem('username') || 'unknown';

    // Build asset data
    const assetData = {
      type: slugType, // Use slug for Firestore
      subType: subType, // Add sub-type field
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
    
    // Update stats using pretty type for display
    const displayType = typeSelect.value === '__custom__' ? prettyType : formatAssetType(assetType);
    if (!assetTypeStats[displayType]) {
      assetTypeStats[displayType] = { total: 0, failed: 0 };
    }
    assetTypeStats[displayType].total++;

    // Update UI
    renderAssetTypeCards();
    updateStats();
    
    // Show success message
    showToast('Asset added successfully', { type: 'success' });
    
    return assetData;
  } catch (error) {
    console.error('Error adding asset:', error);
    showToast(error.message || 'Error adding asset', { type: 'error' });
    throw error; // Re-throw for loading state management
  }
}

// ========== MOVE ASSET FUNCTIONALITY ==========

// Global variable to track the asset being moved
let assetToMove = null;

function showMoveAssetModal(assetId) {
  // Find the asset
  assetToMove = allAssets.find(asset => asset.id === assetId);
  if (!assetToMove) {
    showToast('Asset not found', { type: 'error' });
    return;
  }

  const content = document.getElementById('move-asset-modal-content');
  renderMoveAssetForm(content);
  document.getElementById('move-asset-modal').classList.add('active');
  setupMoveAssetFormListeners();
}

async function renderMoveAssetForm(content) {
  // Fetch locations
  const locations = await fetchLocations();
  
  // Build location options with fallback for empty locations
  let locationOptions = '';
  if (locations.length > 0) {
    locationOptions = locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('');
    locationOptions += '<option value="__custom__">+ Add Custom Location</option>';
  } else {
    locationOptions = '<option value="">No locations found. Please add a location first.</option>';
    locationOptions += '<option value="__custom__">+ Add Custom Location</option>';
  }
  
  content.innerHTML = `
    <form id="move-asset-form">
      <!-- Current Location Display -->
      <div class="current-location">
        <div class="current-location-label">Current Location</div>
        <div class="current-location-value">${assetToMove.location_name} → ${assetToMove.sublocation_name}</div>
      </div>
      
      <!-- New Location Selection -->
      <div class="form-section">
        <div class="form-section-title">
          New Location
        </div>
        
        <div class="form-group">
          <label for="move-location-select" class="required-field">Location</label>
          <select id="move-location-select" required>
            <option value="">Select Location</option>
            ${locationOptions}
          </select>
          <input type="text" id="move-custom-location" placeholder="Enter custom location name..." class="custom-input" style="display:none;" />
        </div>
        
        <div class="form-group">
          <label for="move-sublocation-select" class="required-field">Sub-Location</label>
          <select id="move-sublocation-select" required>
            <option value="">Select Location First</option>
          </select>
          <input type="text" id="move-custom-sublocation" placeholder="Enter custom sub-location name..." class="custom-input" style="display:none;" />
        </div>
      </div>
      
      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" id="cancel-move-asset" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Cancel
        </button>
        <button type="submit" id="submit-move-asset" class="btn btn-primary" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M8 9l3 3-3 3m5 0h3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          Move Asset
        </button>
      </div>
    </form>
  `;
}

function setupMoveAssetFormListeners() {
  const locationSelect = document.getElementById('move-location-select');
  const customLocationInput = document.getElementById('move-custom-location');
  const sublocationSelect = document.getElementById('move-sublocation-select');
  const customSublocationInput = document.getElementById('move-custom-sublocation');
  const form = document.getElementById('move-asset-form');
  const cancelBtn = document.getElementById('cancel-move-asset');
  const submitBtn = document.getElementById('submit-move-asset');

  // Verify all critical elements exist
  const requiredElements = {
    'move-location-select': locationSelect,
    'move-sublocation-select': sublocationSelect,
    'move-asset-form': form,
    'cancel-move-asset': cancelBtn,
    'submit-move-asset': submitBtn
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([id, element]) => !element)
    .map(([id]) => id);

  if (missingElements.length > 0) {
    console.error('Missing required move form elements:', missingElements);
    console.error('Move form may not have rendered properly. Cannot setup listeners.');
    return;
  }

  // Form validation state
  let moveFormState = {
    location: { valid: false, value: '' },
    sublocation: { valid: false, value: '' }
  };

  // Validation functions
  function validateMoveField(fieldName, value) {
    switch (fieldName) {
      case 'location':
        return value && value !== '';
      case 'sublocation':
        return value && value !== '';
      default:
        return true;
    }
  }

  function updateMoveFieldState(fieldName, value) {
    moveFormState[fieldName] = { valid: validateMoveField(fieldName, value), value: value };
    updateMoveSubmitButton();
    updateMoveFieldValidation(fieldName);
  }

  function updateMoveSubmitButton() {
    const allValid = Object.values(moveFormState).every(field => field.valid);
    submitBtn.disabled = !allValid;
  }

  function updateMoveFieldValidation(fieldName) {
    const field = moveFormState[fieldName];
    const inputElement = document.getElementById(`move-${getMoveInputId(fieldName)}`);
    
    if (!inputElement) return;
    
    // Remove existing validation classes
    inputElement.classList.remove('field-error', 'field-success');
    
    // Add appropriate validation class
    if (field.value && field.valid) {
      inputElement.classList.add('field-success');
    } else if (field.value && !field.valid) {
      inputElement.classList.add('field-error');
    }
  }

  function getMoveInputId(fieldName) {
    const idMap = {
      'location': 'location-select',
      'sublocation': 'sublocation-select'
    };
    return idMap[fieldName];
  }

  // Location custom logic
  locationSelect.addEventListener('change', async () => {
    if (locationSelect.value === '__custom__') {
      if (customLocationInput) customLocationInput.style.display = 'block';
      if (customLocationInput) customLocationInput.focus();
      sublocationSelect.innerHTML = '<option value="">Enter custom location first</option>';
      updateMoveFieldState('location', '');
      updateMoveFieldState('sublocation', '');
    } else {
      if (customLocationInput) customLocationInput.style.display = 'none';
      if (customLocationInput) customLocationInput.value = '';
      updateMoveFieldState('location', locationSelect.value);
      
      // Load sublocations for selected location
      try {
        await refreshSublocationDropdown(sublocationSelect, locationSelect.value);
        updateMoveFieldState('sublocation', '');
      } catch (error) {
        console.error('Error loading sublocations:', error);
        sublocationSelect.innerHTML = '<option value="">Error loading sub-locations</option>';
      }
    }
  });

  if (customLocationInput) {
    customLocationInput.addEventListener('input', (e) => {
      updateMoveFieldState('location', e.target.value);
    });
    
    // Create location when user presses Enter or loses focus
    customLocationInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && customLocationInput.value.trim()) {
        e.preventDefault();
        await createMoveCustomLocation();
      }
    });
    
    customLocationInput.addEventListener('blur', async () => {
      if (customLocationInput.value.trim()) {
        await createMoveCustomLocation();
      }
    });
  }

  // Helper function to create custom location for move modal
  async function createMoveCustomLocation() {
    if (!customLocationInput || !customLocationInput.value.trim()) return;
    
    try {
      const locationName = customLocationInput.value.trim();
      const newLocation = await createLocation(locationName, 0);
      
      // Refresh location dropdown and select the new location
      await refreshLocationDropdown(locationSelect);
      locationSelect.value = newLocation.id;
      
      // Hide custom input and update form state
      customLocationInput.style.display = 'none';
      customLocationInput.value = '';
      updateMoveFieldState('location', newLocation.id);
      
      // Load sublocations for the new location
      await refreshSublocationDropdown(sublocationSelect, newLocation.id);
      updateMoveFieldState('sublocation', '');
      
      showToast(`Location "${locationName}" created successfully!`, { type: 'success' });
      
      // Prompt for first sublocation
      await promptForFirstSublocation(newLocation.id, locationName);
      
      // Refresh sublocation dropdown again to show the new sublocation
      await refreshSublocationDropdown(sublocationSelect, newLocation.id);
    } catch (error) {
      console.error('Error creating custom location:', error);
      showToast('Error creating location. Please try again.', { type: 'error' });
    }
  }

  // Helper function to create custom sublocation for move modal
  async function createMoveCustomSublocation() {
    if (!customSublocationInput || !customSublocationInput.value.trim() || !locationSelect.value || locationSelect.value === '__custom__') return;
    
    try {
      const sublocationName = customSublocationInput.value.trim();
      
      // Validate sublocation name
      if (sublocationName.length < 2) {
        showToast('Sub-location name must be at least 2 characters long.', { type: 'error' });
        return;
      }
      
      const newSublocation = await addSublocationToLocation(locationSelect.value, sublocationName);
      
      // Refresh sublocation dropdown and select the new sublocation
      await refreshSublocationDropdown(sublocationSelect, locationSelect.value);
      sublocationSelect.value = newSublocation.id;
      
      // Hide custom input and update form state
      customSublocationInput.style.display = 'none';
      customSublocationInput.value = '';
      updateMoveFieldState('sublocation', newSublocation.id);
      
      showToast(`Sub-location "${sublocationName}" created successfully!`, { type: 'success' });
    } catch (error) {
      console.error('Error creating custom sublocation:', error);
      showToast(error.message || 'Error creating sub-location. Please try again.', { type: 'error' });
    }
  }

  // Sublocation custom logic
  sublocationSelect.addEventListener('change', () => {
    if (sublocationSelect.value === '__custom__') {
      if (customSublocationInput) {
        customSublocationInput.style.display = 'block';
        customSublocationInput.focus();
      }
      updateMoveFieldState('sublocation', '');
    } else {
      if (customSublocationInput) {
        customSublocationInput.style.display = 'none';
        customSublocationInput.value = '';
      }
      updateMoveFieldState('sublocation', sublocationSelect.value);
    }
  });

  if (customSublocationInput) {
    customSublocationInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      updateMoveFieldState('sublocation', value);
    });
    
    // Create sublocation when user presses Enter or loses focus
    customSublocationInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && customSublocationInput.value.trim()) {
        e.preventDefault();
        await createMoveCustomSublocation();
      }
    });
    
    customSublocationInput.addEventListener('blur', async () => {
      if (customSublocationInput.value.trim()) {
        await createMoveCustomSublocation();
      }
    });
  }

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    document.getElementById('move-asset-modal').classList.remove('active');
    assetToMove = null;
  });

  // Form submit with loading state
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    showMoveModalLoading(true);
    
    try {
      await moveAsset();
      showMoveModalSuccess();
    } catch (error) {
      console.error('Error moving asset:', error);
      showToast('Error moving asset. Please try again.', { type: 'error' });
    } finally {
      showMoveModalLoading(false);
    }
  });

  // Initial setup
  updateMoveSubmitButton();
}

// Move modal loading state management
function showMoveModalLoading(show) {
  const modal = document.getElementById('move-asset-modal');
  
  if (show) {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <div class="loading-spinner"></div>
        <div class="loading-text">Moving Asset...</div>
      </div>
    `;
    modal.querySelector('.modal').appendChild(loadingOverlay);
  } else {
    const loadingOverlay = modal.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }
}

// Move modal success state
function showMoveModalSuccess() {
  const content = document.getElementById('move-asset-modal-content');
  content.innerHTML = `
    <div class="success-state">
      <div class="success-icon">✓</div>
      <div class="success-title">Asset Moved Successfully!</div>
      <div class="success-message">The asset has been moved to its new location.</div>
      <button type="button" class="btn btn-primary" onclick="closeMoveAssetModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M5 13l4 4L19 7"/>
        </svg>
        Continue
      </button>
    </div>
  `;
}

// Close move modal function
function closeMoveAssetModal() {
  document.getElementById('move-asset-modal').classList.remove('active');
  assetToMove = null;
  // Reset form after a short delay to allow animation
  setTimeout(() => {
    const content = document.getElementById('move-asset-modal-content');
    content.innerHTML = '';
  }, 300);
}

async function moveAsset() {
  try {
    if (!assetToMove) {
      throw new Error('No asset selected for move');
    }

    const locationSelect = document.getElementById('move-location-select');
    const customLocationInput = document.getElementById('move-custom-location');
    const sublocationSelect = document.getElementById('move-sublocation-select');
    const customSublocationInput = document.getElementById('move-custom-sublocation');

    let locationId = locationSelect.value;
    let locationName = '';
    let sublocationId = sublocationSelect.value;
    let sublocationName = '';

    // Handle custom location
    if (locationId === '__custom__') {
      locationName = customLocationInput.value.trim();
      if (!locationName) {
        throw new Error('Location is required');
      }
      // Create new location using the new function with prettified doc ID
      const newLocation = await createLocation(locationName, 0);
      locationId = newLocation.id;
      locationName = newLocation.name;
    } else {
      locationName = locationSelect.options[locationSelect.selectedIndex].text;
    }

    // Handle custom sublocation
    if (sublocationId === '__custom__') {
      sublocationName = customSublocationInput.value.trim();
      if (!sublocationName) {
        throw new Error('Sub-location is required');
      }
      // Create new sublocation using the new function with prettified doc ID
      const newSublocation = await addSublocationToLocation(locationId, sublocationName);
      sublocationId = newSublocation.id;
      sublocationName = newSublocation.name;
    } else {
      sublocationName = sublocationSelect.options[sublocationSelect.selectedIndex].text;
    }

    // Check if moving to same location
    if (assetToMove.location_id === locationId && assetToMove.sublocation_id === sublocationId) {
      throw new Error('Asset is already at the selected location');
    }

    // Update asset in Firestore
    const assetRef = db.collection('clients').doc(currentClientId).collection('assets').doc(assetToMove.id);
    await assetRef.update({
      location_id: locationId,
      location_name: locationName,
      sublocation_id: sublocationId,
      sublocation_name: sublocationName,
      moved_at: new Date().toISOString(),
      moved_by: sessionStorage.getItem('username') || 'unknown'
    });

    // Update local state
    const assetIndex = allAssets.findIndex(asset => asset.id === assetToMove.id);
    if (assetIndex !== -1) {
      allAssets[assetIndex] = {
        ...allAssets[assetIndex],
        location_id: locationId,
        location_name: locationName,
        sublocation_id: sublocationId,
        sublocation_name: sublocationName,
        moved_at: new Date().toISOString(),
        moved_by: sessionStorage.getItem('username') || 'unknown'
      };
    }

    // Update UI
    renderAssetCards();
    
    // Show success message
    showToast(`Asset moved to ${locationName} → ${sublocationName}`, { type: 'success' });
    
    return true;
  } catch (error) {
    console.error('Error moving asset:', error);
    showToast(error.message || 'Error moving asset', { type: 'error' });
    throw error;
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
  
  const moveAssetModalClose = document.getElementById('move-asset-modal-close');
  if (moveAssetModalClose) {
    moveAssetModalClose.addEventListener('click', () => {
      document.getElementById('move-asset-modal').classList.remove('active');
      assetToMove = null;
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

  // Move Asset Modal: Click outside to close
  const moveAssetModalOverlay = document.getElementById('move-asset-modal');
  if (moveAssetModalOverlay) {
    moveAssetModalOverlay.addEventListener('click', (e) => {
      // Only close if clicking the overlay itself, not the modal content
      if (e.target === moveAssetModalOverlay) {
        moveAssetModalOverlay.classList.remove('active');
        assetToMove = null;
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