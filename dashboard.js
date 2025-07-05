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
import { Calendar } from 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/+esm';

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

      // Special: If Firebase Manager, hide dashboard-right as well
      if (panelId === 'panel-firebase') {
        document.querySelector('.dashboard-right').style.display = 'none';
      } else {
        document.querySelector('.dashboard-right').style.display = '';
      }
    });
  });
  // Set Home as active by default
  document.getElementById('btn-home').classList.add('active');

  // Log out
  document.getElementById('logout-link').onclick = () => {
    sessionStorage.clear();
    window.location.href = "login.html";
  };

  // Load failed assets (Home)
  async function loadFailedAssets() {
    const failedAssetsList = document.getElementById('failed-assets-list');
    if (!failedAssetsList) return; // or show a warning
    failedAssetsList.innerHTML = '';
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
  // Load area statuses
  async function loadAreaStatuses() {
    const table = document.getElementById('area-status-table').querySelector('tbody');
    if (!table) return;

    // 1. Get all locations (Zones)
    const locationsSnapshot = await getDocs(collection(db, `clients/${clientId}/locations`));
    const now = new Date();
    const locations = [];

    console.log("Locations found:", locationsSnapshot.docs.map(doc => doc.id));

    for (const locDoc of locationsSnapshot.docs) {
      const locData = locDoc.data();
      const locationId = locDoc.id;
      const locationName = locData.name || locationId; // Use whatever the client named it
      const expectedAssets = locData.expectedAssets || 0;
      const nextInspectionDate = locData.nextInspectionDate ? locData.nextInspectionDate.toDate() : null;

      // 2. Count active assets in this location (across all sublocations)
      const assetsQuery = query(
        collection(db, `clients/${clientId}/assets`),
        where("locationId", "==", locationId),
        where("status", "==", "Active")
      );
      const assetsSnapshot = await getDocs(assetsQuery);
      const activeCount = assetsSnapshot.size;

      // 3. Calculate days to inspection
      let daysToInspection = null;
      if (nextInspectionDate) {
        const diffMs = nextInspectionDate - now;
        daysToInspection = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      locations.push({
        name: locationName,
        good: activeCount,
        total: expectedAssets,
        daysToInspection: daysToInspection
      });
    }

    // 4. Render table
    table.innerHTML = '';
    locations.forEach(loc => {
      let status = "green";
      if (loc.good < loc.total) {
        status = "red";
      } else if (loc.daysToInspection !== null && loc.daysToInspection < 0) {
        status = "red";
      } else if (loc.daysToInspection !== null && loc.daysToInspection < 7) {
        status = "yellow";
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="area-status-location">
          ${loc.name}
          <span class="area-status-indicator ${status}"></span>
        </td>
        <td class="area-status-count">${loc.good} / ${loc.total} assets</td>
        <td class="area-status-count">
          ${loc.daysToInspection === null ? 'N/A' :
            loc.daysToInspection < 0 ? 'Overdue' :
            loc.daysToInspection === 0 ? 'Due today' :
            `Due in ${loc.daysToInspection}d`}
        </td>
      `;
      table.appendChild(row);
    });
  }

  // Show only Firebase Manager panel and hide right panel
  document.getElementById('btn-firebase').addEventListener('click', () => {
    document.querySelectorAll('.dashboard-panel').forEach(p => p.style.display = 'none');
    document.getElementById('panel-firebase').style.display = 'block';
    const rightPanel = document.querySelector('.dashboard-right');
    if (rightPanel) rightPanel.style.display = 'none';
    loadCollections();
  });

  // Restore right panel when leaving Firebase Manager
  document.querySelectorAll('.sidebar-btn:not(#btn-firebase)').forEach(btn => {
    btn.addEventListener('click', () => {
      const rightPanel = document.querySelector('.dashboard-right');
      if (rightPanel) rightPanel.style.display = '';
    });
  });

  // Load collections into explorer sidebar
  function loadCollections() {
    const sidebar = document.querySelector('.explorer-sidebar');
    sidebar.innerHTML = '';
    const collections = ['clients', 'users']; // Add more as needed
    collections.forEach(col => {
      const div = document.createElement('div');
      div.className = 'explorer-folder';
      div.textContent = '/' + col;
      div.onclick = function() { loadDocuments(col, div); };
      sidebar.appendChild(div);
    });
  }

  // Load documents for a collection
  function loadDocuments(collection, folderDiv) {
    document.querySelectorAll('.explorer-folder').forEach(f => f.classList.remove('active'));
    folderDiv.classList.add('active');
    const main = document.querySelector('.explorer-main');
    main.innerHTML = `<div class="explorer-header">/${collection}</div><div class="explorer-content">Loading...</div>`;
    db.collection(collection).get().then(snapshot => {
      const content = main.querySelector('.explorer-content');
      content.innerHTML = '';
      snapshot.forEach(doc => {
        const docDiv = document.createElement('div');
        docDiv.className = 'explorer-doc';
        docDiv.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;">${doc.id}</span>
            <span>
              <button onclick="editDoc('${collection}','${doc.id}')">Edit</button>
              <button onclick="deleteDoc('${collection}','${doc.id}')">Delete</button>
            </span>
          </div>
          <pre>${JSON.stringify(doc.data(), null, 2)}</pre>
        `;
        content.appendChild(docDiv);
      });
      // Add button to create new doc
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add New Document';
      addBtn.onclick = () => addDocPrompt(collection);
      content.appendChild(addBtn);
    });
  }

  // Add, Edit, Delete functions
  window.addDocPrompt = function(collection) {
    const data = prompt('Enter JSON for new document:');
    if (!data) return;
    try {
      const obj = JSON.parse(data);
      db.collection(collection).add(obj).then(() => loadDocuments(collection, document.querySelector(`.explorer-folder.active`)));
    } catch (e) {
      alert('Invalid JSON');
    }
  }

  window.editDoc = function(collection, docId) {
    const ref = db.collection(collection).doc(docId);
    ref.get().then(doc => {
      const data = prompt('Edit JSON:', JSON.stringify(doc.data(), null, 2));
      if (!data) return;
      try {
        const obj = JSON.parse(data);
        ref.set(obj).then(() => loadDocuments(collection, document.querySelector(`.explorer-folder.active`)));
      } catch (e) {
        alert('Invalid JSON');
      }
    });
  }

  window.deleteDoc = function(collection, docId) {
    if (!confirm('Delete this document?')) return;
    db.collection(collection).doc(docId).delete().then(() => loadDocuments(collection, document.querySelector(`.explorer-folder.active`)));
  }
  // Initial load
  loadFailedAssets();
  loadRecentInspections();
  loadAreaStatuses();
});
