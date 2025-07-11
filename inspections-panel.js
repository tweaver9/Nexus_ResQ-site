// inspections-panel.js - Modern Inspections Panel for Nexus Res-Q Dashboard

import { 
  db, 
  getCurrentClientSubdomain, 
  getClientCollection 
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

// Global variables
let allInspections = [];
let filteredInspections = [];
let allLocations = [];
let allUsers = [];
let allAssetTypes = [];
let currentClientSubdomain = null;
let currentPageSize = 50;
let currentPage = 1;
let currentFilters = {
  search: '',
  date: '',
  user: '',
  location: '',
  status: '',
  assetType: ''
};

// Initialize the inspections panel
export async function initializeInspectionsPanel() {
  currentClientSubdomain = getCurrentClientSubdomain();
  
  if (!currentClientSubdomain) {
    showError('No client context found. Please log in again.');
    return;
  }

  await loadInspectionsData();
  setupEventListeners();
}

// Load all data
async function loadInspectionsData() {
  try {
    showLoading();
    
    // Load inspections, locations, users, and asset types in parallel
    await Promise.all([
      loadInspections(),
      loadLocations(),
      loadUsers(),
      loadAssetTypes()
    ]);

    // Initialize filters and render
    filteredInspections = [...allInspections];
    populateFilterDropdowns();
    renderInspections();
    updateStats();

    console.log(`Loaded ${allInspections.length} inspections for client ${currentClientSubdomain}`);
  } catch (error) {
    console.error('Error loading inspections data:', error);
    showError('Failed to load inspections. Please try again.');
  }
}

// Load inspections from Firestore
async function loadInspections() {
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
      await createSampleInspections();
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
    console.error('Error loading inspections:', error);
    throw error;
  }
}

// Load locations
async function loadLocations() {
  try {
    const snapshot = await getDocs(getClientCollection(currentClientSubdomain, 'locations'));
    allLocations = [];
    
    snapshot.forEach(doc => {
      if (doc.id !== '_placeholder') {
        allLocations.push({
          id: doc.id,
          name: doc.data().name || doc.id,
          ...doc.data()
        });
      }
    });
  } catch (error) {
    console.error('Error loading locations:', error);
  }
}

// Load users
async function loadUsers() {
  try {
    const snapshot = await getDocs(getClientCollection(currentClientSubdomain, 'users'));
    allUsers = [];
    
    snapshot.forEach(doc => {
      if (doc.id !== '_placeholder') {
        const userData = doc.data();
        allUsers.push({
          id: doc.id,
          username: userData.username || userData.firstName || doc.id,
          ...userData
        });
      }
    });
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Load asset types
async function loadAssetTypes() {
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
    
    allAssetTypes = Array.from(assetTypes).sort();
  } catch (error) {
    console.error('Error loading asset types:', error);
  }
}

// Determine inspection status
function determineInspectionStatus(data) {
  if (!data.assets || data.assets.length === 0) return 'unknown';
  
  const totalAssets = data.assets.length;
  const passedAssets = data.assets.filter(a => a.result === 'pass').length;
  const failedAssets = data.assets.filter(a => a.result === 'fail').length;
  
  if (failedAssets === 0) return 'pass';
  if (passedAssets === 0) return 'fail';
  return 'partial';
}

// Group assets by location
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
    grouped[location] = sortAssets(grouped[location]);
  });
  
  return grouped;
}

// Sort assets based on ID type
function sortAssets(assets) {
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

// Create sample inspections if none exist
async function createSampleInspections() {
  try {
    const currentUser = sessionStorage.getItem('username') || 'admin';
    const now = new Date();
    
    const sampleInspections = [
      {
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        user: currentUser,
        assets: [
          { id: 'FE-001', type: 'Fire Extinguisher', location: 'Building A - Floor 1', result: 'pass' },
          { id: 'FE-002', type: 'Fire Extinguisher', location: 'Building A - Floor 1', result: 'pass' },
          { id: 'AED-001', type: 'AED', location: 'Building A - Lobby', result: 'pass' },
          { id: 'SM-001', type: 'Smoke Detector', location: 'Building A - Floor 2', result: 'fail', issues: ['Battery low', 'Dust accumulation'] }
        ],
        scanOrder: [1, 2, 3, 4]
      },
      {
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        user: 'inspector_jane',
        assets: [
          { id: 'FE-010', type: 'Fire Extinguisher', location: 'Building B - Floor 1', result: 'pass' },
          { id: 'FE-011', type: 'Fire Extinguisher', location: 'Building B - Floor 1', result: 'fail', issues: ['Pressure low'] },
          { id: 'EX-001', type: 'Emergency Exit', location: 'Building B - Stairwell', result: 'pass' }
        ],
        scanOrder: [1, 2, 3]
      }
    ];

    const inspectionsCollection = getClientCollection(currentClientSubdomain, 'inspections');
    
    for (const inspectionData of sampleInspections) {
      await addDoc(inspectionsCollection, inspectionData);
    }
    
    console.log('Sample inspections created successfully');
  } catch (error) {
    console.error('Error creating sample inspections:', error);
  }
}

// Export functions for global access
export { 
  loadInspectionsData,
  renderInspections,
  downloadInspectionPDF,
  exportInspections,
  clearAllFilters
};
