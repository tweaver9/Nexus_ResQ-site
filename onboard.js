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

// ===== Section 4: Clients View Renderer =====

async function renderClientsView() {
  contentArea.innerHTML = `<h2>Clients</h2><p style="color:#666;">Loading clients...</p>`;

  const clientSnap = await getDocs(collection(db, 'clients'));

  let html = `
    <h2 style="margin-top:0;">Clients</h2>
    <div style="margin-bottom:20px;">
      <button style="background:#2c91f0;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;" onclick="alert('Add Client Coming Soon')">
        + Add New Client
      </button>
    </div>
    <div style="display:flex; flex-direction:column; gap:16px;">
  `;

  clientSnap.forEach(docSnap => {
    const c = docSnap.data();
    html += `
      <div style="border:1px solid #ccc; border-radius:8px; padding:16px;">
        <h3 style="margin:0 0 6px;">${c.name || '(Unnamed Client)'}</h3>
        <p style="margin:0; color:#666;"><strong>Slug:</strong> ${docSnap.id}</p>
        <div style="margin-top:8px;">
          <button style="margin-right:10px;" onclick="alert('Edit Coming Soon')">Edit</button>
          <button onclick="alert('Delete Coming Soon')">Delete</button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  contentArea.innerHTML = html;
}

// ===== Section 4 End =====

// ===== Section 5: Locations View Renderer =====

async function renderLocationsView() {
  const clientId = sessionStorage.getItem('client');
  if (!clientId) {
    contentArea.innerHTML = `<p style="color:#900;">No client selected. Please choose one from the sidebar.</p>`;
    return;
  }

  contentArea.innerHTML = `<h2>Locations</h2><p style="color:#666;">Loading...</p>`;

  const locSnap = await getDocs(collection(db, 'clients', clientId, 'locations'));

  let html = `
    <h2 style="margin-top:0;">Locations for ${clientId}</h2>
    <div style="margin-bottom:20px;">
      <button style="background:#2c91f0;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;" onclick="alert('Add Location Coming Soon')">
        + Add New Location
      </button>
    </div>
    <div style="display:flex; flex-direction:column; gap:16px;">
  `;

  if (locSnap.empty) {
    html += `<p style="color:#666;">No locations found for this client.</p>`;
  } else {
    locSnap.forEach(docSnap => {
      const loc = docSnap.data();
      html += `
        <div style="border:1px solid #ccc; border-radius:8px; padding:16px;">
          <h3 style="margin:0 0 6px;">${loc.name || '(Unnamed Location)'}</h3>
          <p style="margin:0; color:#666;"><strong>ID:</strong> ${docSnap.id}</p>
          <div style="margin-top:8px;">
            <button style="margin-right:10px;" onclick="alert('Edit Coming Soon')">Edit</button>
            <button onclick="alert('Delete Coming Soon')">Delete</button>
          </div>
        </div>
      `;
    });
  }

  html += `</div>`;
  contentArea.innerHTML = html;
}

// ===== Section 5 End =====

// ===== Section 6: Templates View Renderer =====

async function renderTemplatesView() {
  const clientId = sessionStorage.getItem('client');
  if (!clientId) {
    contentArea.innerHTML = `<p style="color:#900;">No client selected. Please choose one from the sidebar.</p>`;
    return;
  }

  contentArea.innerHTML = `<h2>Templates</h2><p style="color:#666;">Loading...</p>`;

  const templateSnap = await getDocs(collection(db, 'clients', clientId, 'templates'));

  let html = `
    <h2 style="margin-top:0;">Templates for ${clientId}</h2>
    <div style="margin-bottom:20px;">
      <button style="background:#2c91f0;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;" onclick="alert('Add Template Coming Soon')">
        + Add New Template
      </button>
    </div>
    <div style="display:flex; flex-direction:column; gap:16px;">
  `;

  if (templateSnap.empty) {
    html += `<p style="color:#666;">No templates found for this client.</p>`;
  } else {
    templateSnap.forEach(docSnap => {
      const t = docSnap.data();
      html += `
        <div style="border:1px solid #ccc; border-radius:8px; padding:16px;">
          <h3 style="margin:0 0 6px;">${t.title || '(Untitled Template)'}</h3>
          <p style="margin:0; color:#666;"><strong>ID:</strong> ${docSnap.id}</p>
          <div style="margin-top:8px;">
            <button style="margin-right:10px;" onclick="alert('Edit Coming Soon')">Edit</button>
            <button onclick="alert('Delete Coming Soon')">Delete</button>
          </div>
        </div>
      `;
    });
  }

  html += `</div>`;
  contentArea.innerHTML = html;
}

// ===== Section 6 End =====

// ===== Section 7: Logs View Renderer =====

async function renderLogsView() {
  const clientId = sessionStorage.getItem('client');
  if (!clientId) {
    contentArea.innerHTML = `<p style="color:#900;">No client selected. Please choose one from the sidebar.</p>`;
    return;
  }

  contentArea.innerHTML = `<h2>Logs</h2><p style="color:#666;">Loading logs...</p>`;

  const logsRef = collection(db, 'clients', clientId, 'logs');
  const logSnap = await getDocs(logsRef);

  let html = `
    <h2 style="margin-top:0;">Logs for ${clientId}</h2>
    <div style="margin-bottom:20px;">
      <p style="color:#666;">Logs include recent activity like inspections, edits, or assignments.</p>
    </div>
    <div style="display:flex; flex-direction:column; gap:14px;">
  `;

  if (logSnap.empty) {
    html += `<p style="color:#666;">No logs found for this client.</p>`;
  } else {
    const sorted = [...logSnap.docs].sort((a, b) => {
      return (b.data().timestamp?.toMillis?.() || 0) - (a.data().timestamp?.toMillis?.() || 0);
    });

    sorted.forEach(docSnap => {
      const log = docSnap.data();
      const time = log.timestamp?.toDate?.().toLocaleString() || 'Unknown Time';
      html += `
        <div style="border:1px solid #ddd; border-radius:8px; padding:12px;">
          <p style="margin:0;"><strong>${log.action || '(No Action)'}</strong></p>
          <p style="margin:4px 0 0; font-size:0.9em; color:#666;">
            ${log.user || 'Unknown User'} — ${time}
          </p>
        </div>
      `;
    });
  }

  html += `</div>`;
  contentArea.innerHTML = html;
}

// ===== Section 7 End =====

// ===== Section 8: Assignments View Renderer =====

async function renderAssignmentsView() {
  const clientId = sessionStorage.getItem('client');
  if (!clientId) {
    contentArea.innerHTML = `<p style="color:#900;">No client selected. Please choose one from the sidebar.</p>`;
    return;
  }

  // TEMP — simulate the logged-in user (replace with real user logic)
  const currentUser = sessionStorage.getItem('username') || 'demoUser';

  contentArea.innerHTML = `<h2>Assignments</h2><p style="color:#666;">Loading assignment data...</p>`;

  const assignmentRef = doc(db, 'clients', clientId, 'assignments', currentUser);
  const assignmentSnap = await getDoc(assignmentRef);
  const assignedZone = assignmentSnap.exists() ? assignmentSnap.data().zone : null;

  let html = `
    <h2 style="margin-top:0;">Assignments for ${currentUser}</h2>
    <div style="margin-bottom:20px;">
      <p style="font-size:1.1em;">Assigned: <strong>${assignedZone || 'No Assignment'}</strong></p>
    </div>

    <div style="margin-bottom:16px;">
      <label for="assignBy" style="font-weight:600;">Assign by:</label>
      <select id="assignBy" style="margin-left:8px; padding:6px 12px; border-radius:6px; border:1px solid #ccc;">
        <option value="">-- Select Option --</option>
        <option value="location">Location</option>
        <option value="category">Category</option>
        <option value="asset">Asset</option>
      </select>
    </div>

    <div id="assignOptionsBox" style="margin-top:20px; color:#666;">
      <p>Select a method to assign assets. Options will appear here.</p>
    </div>
  `;

  contentArea.innerHTML = html;

  const assignByDropdown = document.getElementById('assignBy');
  const assignBox = document.getElementById('assignOptionsBox');

  assignByDropdown.addEventListener('change', () => {
    const method = assignByDropdown.value;
    if (!method) {
      assignBox.innerHTML = `<p>Select a method to assign assets. Options will appear here.</p>`;
      return;
    }

    assignBox.innerHTML = `<p><em>Loading ${method} options...</em></p>`;

    // Future hook point: dynamically render options for that method
    setTimeout(() => {
      assignBox.innerHTML = `<p><strong>${method.toUpperCase()} assignment tool coming soon.</strong></p>`;
    }, 600);
  });
}

// ===== Section 8 End =====

// ===== Section 9: Global Helpers & Utilities =====

// Turns "Building 7 South" into "building-7-south"
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Formats a Firestore Timestamp to readable string
function formatDate(ts) {
  if (!ts?.toDate) return 'Unknown';
  return ts.toDate().toLocaleString();
}

// Placeholder: add more shared helpers below as needed

// ===== Section 9 End =====

