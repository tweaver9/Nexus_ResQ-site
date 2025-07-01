// ===== Section 1: Firebase Setup & Nexus Access Check =====

// Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAqnCQnFROLiVsQPIvgOe7mAciDiwCuLOg",
  authDomain: "nexus-res-q.firebaseapp.com",
  projectId: "nexus-res-q",
  storageBucket: "nexus-res-q.firebasestorage.app",
  messagingSenderId: "203995658810",
  appId: "1:203995658810:web:97ae2ef0e9d1ed785cd303"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Role Gate
if (sessionStorage.role !== 'nexus') {
  document.body.innerHTML = '<div style="color:#f33;font-size:1.3em;margin:64px auto;max-width:420px;text-align:center;">Access Denied<br>This page is restricted to Nexus Owners.</div>';
  throw new Error("Unauthorized Access");
}

// ===== Section 1 End =====

// ===== Section 2: Client Selector Loader =====

const clientSelector = document.getElementById('clientSelector');

// Load all clients from Firestore into dropdown
async function loadClientsIntoSelector() {
  const clientSnap = await getDocs(collection(db, 'clients'));
  clientSnap.forEach(docSnap => {
    const opt = document.createElement('option');
    opt.value = docSnap.id;
    opt.textContent = docSnap.data().name || docSnap.id;
    clientSelector.appendChild(opt);
  });

  // Preload last-used client if available
  const saved = sessionStorage.getItem('client');
  if (saved) clientSelector.value = saved;
}

// Save selected client to session storage
clientSelector.addEventListener('change', () => {
  const selected = clientSelector.value;
  if (selected) {
    sessionStorage.setItem('client', selected);
    loadDefaultContent(); // refresh content area if needed
  }
});

loadClientsIntoSelector();

// ===== Section 2 End =====

// ===== Section 3: Sidebar Navigation Routing =====

const contentArea = document.getElementById('contentArea');

// Route map
const sectionRenderers = {
  clients: renderClientsView,
  locations: renderLocationsView,
  templates: renderTemplatesView,
  logs: renderLogsView,
  assignments: renderAssignmentsView
};

// Attach click handlers
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    if (!sectionRenderers[section]) {
      contentArea.innerHTML = `<p style="color:#900;font-weight:bold;">Unknown section: ${section}</p>`;
      return;
    }

    highlightActiveButton(btn);
    sectionRenderers[section]();
  });
});

// Highlight selected nav
function highlightActiveButton(activeBtn) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
  activeBtn.classList.add('active-nav');
}

// Default load handler
function loadDefaultContent() {
  contentArea.innerHTML = `
    <h1>Welcome to the Owner Dashboard</h1>
    <p>Select a section from the sidebar to begin managing client data.</p>
  `;
}

loadDefaultContent();

// ===== Section 3 End =====