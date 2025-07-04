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

window.addEventListener('DOMContentLoaded', () => {
  // Session
  const clientId = sessionStorage.getItem('tenant_id');
  const username = sessionStorage.getItem('username');
  const role = sessionStorage.getItem('role');
  const clientLogoUrl = sessionStorage.getItem('clientLogoUrl');

  // Redirect if not logged in
  if (!clientId || !username || !role) {
    window.location.href = "login.html";
    return;
  }

  // Set logo and welcome
  const logoImg = document.getElementById('client-logo');
  if (logoImg && clientLogoUrl) logoImg.src = clientLogoUrl;
  document.getElementById('dashboard-title').textContent = `${clientId.charAt(0).toUpperCase() + clientId.slice(1)} Dashboard`;
  document.getElementById('welcome-message').textContent = username
    ? `Welcome Back, ${username.charAt(0).toUpperCase() + username.slice(1)}!`
    : 'Welcome Back!';

  // Sidebar role-based visibility
  const roleButtonMap = {
    admin:    ['home', 'users', 'assets', 'inspections', 'logs', 'analytics', 'assignments', 'billing', 'help'],
    manager:  ['home', 'users', 'assets', 'inspections', 'logs', 'analytics', 'assignments', 'help'],
    user:     ['home', 'inspections', 'logs', 'analytics', 'assignments', 'help'],
    nexus:    [
      'home', 'users', 'assets', 'inspections', 'logs', 'analytics', 'assignments', 'billing', 'help',
      'firebase', 'onboard'
    ]
  };

  const allowedPanels = roleButtonMap[role] || roleButtonMap['user'];
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    const panel = btn.id.replace('btn-', '');
    if (!allowedPanels.includes(panel)) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
  });

  // Sidebar navigation logic
  const panels = Array.from(document.querySelectorAll('.dashboard-panel'));
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all buttons
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Hide all panels
      panels.forEach(panelDiv => panelDiv.style.display = 'none');
      // Show the selected panel
      const panelId = 'panel-' + btn.id.replace('btn-', '');
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = 'block';
    });
  });
  // Set Home as active by default
  document.getElementById('btn-home').classList.add('active');

  // Log out
  document.getElementById('logout-link').onclick = () => {
    sessionStorage.clear();
    window.location.href = "login.html";
  };

  // Tabs logic (Monthly/Annual)
  document.getElementById('tab-monthly').onclick = function() {
    this.classList.add('active');
    document.getElementById('tab-annual').classList.remove('active');
    // TODO: Load monthly data
  };
  document.getElementById('tab-annual').onclick = function() {
    this.classList.add('active');
    document.getElementById('tab-monthly').classList.remove('active');
    // TODO: Load annual data
  };

  // Area status (placeholder logic)
  document.getElementById('area-a-status').className = 'done';
  document.getElementById('area-a-status').textContent = 'Area A — ✅ Done';
  document.getElementById('area-b-status').className = 'not-done';
  document.getElementById('area-b-status').textContent = 'Area B — ❌ Not Done';

  // Load failed assets (Home)
  async function loadFailedAssets() {
    const failedAssetsList = document.getElementById('failed-assets-list');
    try {
      const inspectionsCol = collection(db, `clients/${clientId}/inspections`);
      const q = query(
        inspectionsCol,
        where("result", "==", "fail"),
        orderBy("timestamp", "desc"),
        limit(10)
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
        line.textContent = `${i.assetName || i.assetId || 'Unknown Asset'} (${i.zone || 'Zone ?'}) — Tag: ${i.tag || 'N/A'} — ${i.timestamp ? new Date(i.timestamp).toLocaleString() : ''}`;
        failedAssetsList.appendChild(line);
      });
    } catch (e) {
      failedAssetsList.innerHTML = `<div class="dashboard-placeholder">Error loading failed assets.</div>`;
    }
  }

  // Load recent inspections (Home)
  async function loadRecentInspections() {
    const inspectionList = document.getElementById('inspection-list');
    try {
      const inspectionsCol = collection(db, `clients/${clientId}/inspections`);
      const q = query(inspectionsCol, orderBy("timestamp", "desc"), limit(30));
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
        line.textContent = `${i.user || 'Unknown'} — ${i.assetName || i.assetId || 'Unknown Asset'} — ${i.zone || 'Zone ?'} — ${i.timestamp ? new Date(i.timestamp).toLocaleString() : ''}`;
        inspectionList.appendChild(line);
      });
    } catch (e) {
      inspectionList.innerHTML = `<div class="dashboard-placeholder">Error loading inspections.</div>`;
    }
  }

  // Initialize FullCalendar
  const calendarEl = document.getElementById('calendar');
  if (calendarEl) {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      height: 400,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      }
    });
    calendar.render();
  }

  // Initial load
  loadFailedAssets();
  loadRecentInspections();
});

<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js"></script>
