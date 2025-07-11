// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Load Firebase configuration from environment variables or fallback to defaults
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyAqnCQnFROLiVsQPIvgOe7mAciDiwCuLOg",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "nexus-res-q.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "nexus-res-q",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "nexus-res-q.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "203995658810",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:203995658810:web:97ae2ef0e9d1ed785cd303",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-B7B1QZVWFG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ========== UTILITY FUNCTIONS FOR MULTI-TENANT FIREBASE STRUCTURE ==========

/**
 * Get the current client subdomain from session storage
 * @returns {string|null} The client subdomain or null if not found
 */
export function getCurrentClientSubdomain() {
  return sessionStorage.getItem('tenant_id') || sessionStorage.getItem('clientSubdomain');
}

/**
 * Extract subdomain from current hostname
 * @returns {string|null} The subdomain or null if not found
 */
export function getSubdomainFromHostname() {
  const parts = window.location.hostname.split(".");
  return parts.length > 2 ? parts[0] : null;
}

/**
 * Get client-specific collection reference
 * @param {string} clientSubdomain - The client subdomain
 * @param {string} collectionName - The collection name (assets, users, locations, etc.)
 * @returns {import('firebase/firestore').CollectionReference}
 */
export function getClientCollection(clientSubdomain, collectionName) {
  if (!clientSubdomain) {
    throw new Error('Client subdomain is required for client-specific collections');
  }
  return collection(db, 'clients', clientSubdomain, collectionName);
}

/**
 * Get client-specific document reference
 * @param {string} clientSubdomain - The client subdomain
 * @param {string} collectionName - The collection name
 * @param {string} docId - The document ID
 * @returns {import('firebase/firestore').DocumentReference}
 */
export function getClientDoc(clientSubdomain, collectionName, docId) {
  if (!clientSubdomain) {
    throw new Error('Client subdomain is required for client-specific documents');
  }
  return doc(db, 'clients', clientSubdomain, collectionName, docId);
}

/**
 * Get client root document reference
 * @param {string} clientSubdomain - The client subdomain
 * @returns {import('firebase/firestore').DocumentReference}
 */
export function getClientRootDoc(clientSubdomain) {
  if (!clientSubdomain) {
    throw new Error('Client subdomain is required');
  }
  return doc(db, 'clients', clientSubdomain);
}

/**
 * Load asset types with fallback logic
 * First checks client-specific asset_types, then falls back to global asset_types
 * @param {string} clientSubdomain - The client subdomain
 * @returns {Promise<Array>} Array of asset type objects
 */
export async function loadAssetTypesWithFallback(clientSubdomain) {
  const assetTypes = [];

  try {
    // First try client-specific asset types
    if (clientSubdomain) {
      const clientAssetTypesSnap = await getDocs(getClientCollection(clientSubdomain, 'asset_types'));
      clientAssetTypesSnap.forEach(doc => {
        assetTypes.push({ id: doc.id, ...doc.data(), source: 'client' });
      });
    }

    // If no client-specific types found, fall back to global asset types
    if (assetTypes.length === 0) {
      const globalAssetTypesSnap = await getDocs(collection(db, 'asset_types'));
      globalAssetTypesSnap.forEach(doc => {
        assetTypes.push({ id: doc.id, ...doc.data(), source: 'global' });
      });
    }

    return assetTypes;
  } catch (error) {
    console.error('Error loading asset types:', error);
    return [];
  }
}

/**
 * Load question templates with fallback logic
 * First checks client-specific questionTemplates, then falls back to global questionTemplates
 * @param {string} clientSubdomain - The client subdomain
 * @returns {Promise<Array>} Array of question template objects
 */
export async function loadQuestionTemplatesWithFallback(clientSubdomain) {
  const questionTemplates = [];

  try {
    // First try client-specific question templates
    if (clientSubdomain) {
      const clientTemplatesSnap = await getDocs(getClientCollection(clientSubdomain, 'questionTemplates'));
      clientTemplatesSnap.forEach(doc => {
        questionTemplates.push({ id: doc.id, ...doc.data(), source: 'client' });
      });
    }

    // If no client-specific templates found, fall back to global templates
    if (questionTemplates.length === 0) {
      const globalTemplatesSnap = await getDocs(collection(db, 'questionTemplates'));
      globalTemplatesSnap.forEach(doc => {
        questionTemplates.push({ id: doc.id, ...doc.data(), source: 'global' });
      });
    }

    return questionTemplates;
  } catch (error) {
    console.error('Error loading question templates:', error);
    return [];
  }
}

/**
 * Get client settings from the client root document
 * @param {string} clientSubdomain - The client subdomain
 * @returns {Promise<Object|null>} Client settings object or null if not found
 */
export async function getClientSettings(clientSubdomain) {
  try {
    if (!clientSubdomain) return null;

    const clientDocSnap = await getDoc(getClientRootDoc(clientSubdomain));
    if (clientDocSnap.exists()) {
      const data = clientDocSnap.data();
      return {
        name: data.name,
        logo_url: data.logo_url,
        subdomain: data.subdomain,
        settings: data.settings || {},
        ...data
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading client settings:', error);
    return null;
  }
}

/**
 * Validate that a client subdomain exists
 * @param {string} clientSubdomain - The client subdomain to validate
 * @returns {Promise<boolean>} True if client exists, false otherwise
 */
export async function validateClientExists(clientSubdomain) {
  try {
    if (!clientSubdomain) return false;

    const clientDocSnap = await getDoc(getClientRootDoc(clientSubdomain));
    return clientDocSnap.exists();
  } catch (error) {
    console.error('Error validating client:', error);
    return false;
  }
}

/**
 * Generate a unique 4-digit precision location code within a sublocation
 * @param {string} clientSubdomain - The client subdomain
 * @param {string} locationCode - The parent location code
 * @param {string} sublocationCode - The parent sublocation code
 * @returns {Promise<string>} A unique 4-digit precision location code
 */
export async function generatePrecisionLocationCode(clientSubdomain, locationCode, sublocationCode) {
  try {
    // Get all existing precision locations for this sublocation
    const locationsSnap = await getDocs(getClientCollection(clientSubdomain, 'locations'));
    const existingCodes = new Set();

    locationsSnap.forEach(doc => {
      const data = doc.data();
      if (data.level === 2 &&
          data.parentLocationCode === locationCode &&
          data.parentSublocationCode === sublocationCode) {
        existingCodes.add(data.code);
      }
    });

    // Generate a unique 4-digit code
    let code;
    let attempts = 0;
    const maxAttempts = 9999;

    do {
      code = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
      attempts++;
    } while (existingCodes.has(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique precision location code');
    }

    return code;
  } catch (error) {
    console.error('Error generating precision location code:', error);
    throw error;
  }
}

/**
 * Create a new precision location
 * @param {string} clientSubdomain - The client subdomain
 * @param {string} locationCode - The parent location code
 * @param {string} sublocationCode - The parent sublocation code
 * @param {string} name - The precision location name
 * @returns {Promise<string>} The generated precision location code
 */
export async function createPrecisionLocation(clientSubdomain, locationCode, sublocationCode, name) {
  try {
    const precisionCode = await generatePrecisionLocationCode(clientSubdomain, locationCode, sublocationCode);

    const precisionLocationData = {
      name: name || `Precision Location ${precisionCode}`,
      code: precisionCode,
      level: 2,
      parentLocationCode: locationCode,
      parentSublocationCode: sublocationCode,
      created: new Date().toISOString(),
      createdBy: getCurrentClientSubdomain() // Could be enhanced with actual user
    };

    const docId = `precision_${locationCode}_${sublocationCode}_${precisionCode}`;
    await setDoc(
      getClientDoc(clientSubdomain, 'locations', docId),
      precisionLocationData
    );

    return precisionCode;
  } catch (error) {
    console.error('Error creating precision location:', error);
    throw error;
  }
}
