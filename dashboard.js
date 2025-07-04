import { db } from './firebase.js';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- 1. DOM Elements ----------
const logoImg = document.getElementById('client-logo');
const clientLogoUrl = sessionStorage.getItem('clientLogoUrl');
if (logoImg) {
  logoImg.src = clientLogoUrl || "logos/nexusresq.jpg";
}
const dashboardTitle = document.getElementById('dashboard-title');
const welcomeMessage = document.getElementById('welcome-message');
const logoutLink = document.getElementById('logout-link');

const activityList = document.getElementById('activity-list');
const inspectionList = document.getElementById('inspection-list');
const failedAssetsList = document.getElementById('failed-assets-list');
const onboardBtn = document.getElementById('onboard-btn');

// ---------- 2. Session Data ----------
const clientId = sessionStorage.getItem('tenant_id');
const username = sessionStorage.getItem('username');
const role = sessionStorage.getItem('role');

// ---------- 3. Redirect if not logged in ----------
const loggedIn = localStorage.getItem('nexus_logged_in');
if (!loggedIn) {
  window.location.href = "login.html";
}

// ---------- 4. Load client info (logo, name) ----------
async function loadClientInfo() {
  try {
    const clientDocRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientDocRef);
    if (clientSnap.exists()) {
      const client = clientSnap.data();
      if (client.logo_url) logoImg.src = client.logo_url;
      if (client.name) dashboardTitle.textContent = client.name + " Dashboard";
    } else {
      dashboardTitle.textContent = "Client Dashboard";
    }
  } catch {
    dashboardTitle.textContent = "Client Dashboard";
  }
}

// ---------- 5. Welcome Message ----------
welcomeMessage.textContent = `Welcome, ${username}!`;

// ---------- 6. Log Out Button ----------
logoutLink.addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = "login.html";
});

// ---------- 7. Load Recent Activity (last 5) ----------
async function loadRecentActivity() {
  try {
    // Example: 'activity' subcollection under client
    const actionsCol = collection(db, `clients/${clientId}/activity`);
    const q = query(actionsCol, orderBy("timestamp", "desc"), limit(5));
    const snapshot = await getDocs(q);

    activityList.innerHTML = '';
    if (snapshot.empty) {
      activityList.innerHTML = `<div class="dashboard-placeholder">No recent activity.</div>`;
      return;
    }
    snapshot.forEach(doc => {
      const a = doc.data();
      const line = document.createElement('div');
      line.className = "activity-row";
      line.textContent = `${a.user || 'System'}: ${a.action || 'Action'} (${a.timestamp ? new Date(a.timestamp).toLocaleString() : ''})`;
      activityList.appendChild(line);
    });
  } catch (e) {
    activityList.innerHTML = `<div class="dashboard-placeholder">Error loading activity.</div>`;
  }
}

// ---------- 8. Load Most Recent Inspections (last 5) ----------
async function loadRecentInspections() {
  try {
    const inspectionsCol = collection(db, `clients/${clientId}/inspections`);
    const q = query(inspectionsCol, orderBy("timestamp", "desc"), limit(5));
    const snapshot = await getDocs(q);

    inspectionList.innerHTML = '';
    if (snapshot.empty) {
      inspectionList.innerHTML = `<div class="dashboard-placeholder">No inspections submitted yet.</div>`;
      return;
    }
    snapshot.forEach(doc => {
      const i = doc.data();
      const line = document.createElement('div');
      line.className = "inspection-row";
      line.textContent = `#${i.assetName || i.assetId || 'Unknown Asset'} by ${i.user || 'Unknown'} (${i.timestamp ? new Date(i.timestamp).toLocaleString() : ''})`;
      inspectionList.appendChild(line);
    });
  } catch (e) {
    inspectionList.innerHTML = `<div class="dashboard-placeholder">Error loading inspections.</div>`;
  }
}

// ---------- 9. Load Assets Failed Inspection (last 5) ----------
async function loadFailedAssets() {
  try {
    const inspectionsCol = collection(db, `clients/${clientId}/inspections`);
    const q = query(
      inspectionsCol,
      where("result", "==", "fail"),
      orderBy("timestamp", "desc"),
      limit(5)
    );
    const snapshot = await getDocs(q);

    failedAssetsList.innerHTML = '';
    if (snapshot.empty) {
      failedAssetsList.innerHTML = `<div class="dashboard-placeholder">No failed assets reported.</div>`;
      return;
    }
    snapshot.forEach(doc => {
      const i = doc.data();
      const line = document.createElement('div');
      line.className = "failed-row";
      line.textContent = `#${i.assetName || i.assetId || 'Unknown Asset'} (${i.user || 'Unknown'}) at ${i.timestamp ? new Date(i.timestamp).toLocaleString() : ''}`;
      failedAssetsList.appendChild(line);
    });
  } catch (e) {
    failedAssetsList.innerHTML = `<div class="dashboard-placeholder">Error loading failed assets.</div>`;
  }
}

// ---------- 10. Show Nexus-Only Onboard Button ----------
function showOrHideNexusButtons() {
  // Only show Onboard if role is exactly "nexus"
  if (onboardBtn) {
    if (role === "nexus") {
      onboardBtn.style.display = "";
    } else {
      onboardBtn.style.display = "none";
    }
  }
}

// ---------- 11. Run All Loaders ----------
loadClientInfo();
showOrHideNexusButtons();
loadRecentActivity();
loadRecentInspections();
loadFailedAssets();
