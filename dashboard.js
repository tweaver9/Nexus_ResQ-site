// --- COMPAT-ONLY FIRESTORE DASHBOARD.JS ---

if (!window.firestoreCompat && window.firebase && window.firebase.firestore) {
  window.firestoreCompat = window.firebase.firestore();
}
const db = window.firestoreCompat;

window.addEventListener('DOMContentLoaded', () => {
  // Session check
  const clientId = sessionStorage.getItem('tenant_id');
  const username = sessionStorage.getItem('username');
  const role = sessionStorage.getItem('role');
  const clientLogoUrl = sessionStorage.getItem('clientLogoUrl');

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
    btn.style.display = allowedPanels.includes(panel) ? '' : 'none';
  });

  // Sidebar navigation logic
  const panels = Array.from(document.querySelectorAll('.dashboard-panel'));
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      panels.forEach(panelDiv => panelDiv.style.display = 'none');
      const panelId = 'panel-' + btn.id.replace('btn-', '');
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = 'block';
      if (panelId === 'panel-firebase') {
        document.querySelector('.dashboard-right').style.display = 'none';
      } else {
        document.querySelector('.dashboard-right').style.display = '';
      }
      // Only load these when Home is shown
      if (panelId === 'panel-home') {
        loadFailedAssets();
        loadRecentInspections();
        loadAreaStatuses();
      }
    });
  });
  document.getElementById('btn-home').classList.add('active');

  document.getElementById('logout-link').onclick = () => {
    sessionStorage.clear();
    window.location.href = "login.html";
  };

  // --- FIRESTORE DATA LOADERS (COMPAT) ---

  async function loadFailedAssets() {
    const failedAssetsList = document.getElementById('failed-assets-list');
    if (!failedAssetsList) return;
    failedAssetsList.innerHTML = '';
    try {
      const q = db.collection(`clients/${clientId}/inspections`)
        .where("result", "==", "fail")
        .orderBy("timestamp", "desc")
        .limit(10);
      const snapshot = await q.get();
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

  async function loadRecentInspections() {
    const inspectionList = document.getElementById('inspection-list');
    try {
      const q = db.collection(`clients/${clientId}/inspections`)
        .orderBy("timestamp", "desc")
        .limit(30);
      const snapshot = await q.get();
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

  async function loadAreaStatuses() {
    const table = document.getElementById('area-status-table').querySelector('tbody');
    if (!table) return;
    const locationsSnapshot = await db.collection(`clients/${clientId}/locations`).get();
    const now = new Date();
    const locations = [];
    for (const locDoc of locationsSnapshot.docs) {
      const locData = locDoc.data();
      const locationId = locDoc.id;
      const locationName = locData.name || locationId;
      const expectedAssets = locData.expectedAssets || 0;
      const nextInspectionDate = locData.nextInspectionDate ? locData.nextInspectionDate.toDate() : null;
      const assetsQuery = db.collection(`clients/${clientId}/assets`)
        .where("locationId", "==", locationId)
        .where("status", "==", "Active");
      const assetsSnapshot = await assetsQuery.get();
      const activeCount = assetsSnapshot.size;
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
    table.innerHTML = '';
    locations.forEach(loc => {
      let status = "green";
      if (loc.good < loc.total) status = "red";
      else if (loc.daysToInspection !== null && loc.daysToInspection < 0) status = "red";
      else if (loc.daysToInspection !== null && loc.daysToInspection < 7) status = "yellow";
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

  // --- FIREBASE MANAGER EXPLORER (COMPAT) ---

  document.getElementById('btn-firebase').addEventListener('click', () => {
    document.querySelectorAll('.dashboard-panel').forEach(p => p.style.display = 'none');
    document.getElementById('panel-firebase').style.display = 'block';
    const rightPanel = document.querySelector('.dashboard-right');
    if (rightPanel) rightPanel.style.display = 'none';
    window.openFirestorePath([]);
  });

  document.querySelectorAll('.sidebar-btn:not(#btn-firebase)').forEach(btn => {
    btn.addEventListener('click', () => {
      const rightPanel = document.querySelector('.dashboard-right');
      if (rightPanel) rightPanel.style.display = '';
    });
  });

  window.openFirestorePath = async function(pathSegments) {
    const sidebar = document.querySelector('.explorer-sidebar');
    const main = document.querySelector('.explorer-main');
    sidebar.innerHTML = '';
    main.innerHTML = '';

    // Breadcrumbs
    let breadcrumb = '<span style="cursor:pointer;color:#fdd835;" onclick="window.openFirestorePath([])">::root</span>';
    let currentPath = [];
    pathSegments.forEach((seg, i) => {
      currentPath.push(seg);
      breadcrumb += ` / <span style="cursor:pointer;color:#fdd835;" onclick="window.openFirestorePath(${JSON.stringify(currentPath)})">${seg}</span>`;
    });
    main.innerHTML = `<div class="explorer-header">${breadcrumb}</div><div class="explorer-content">Loading...</div>`;

    if (pathSegments.length === 0) {
      // ROOT: show root collections from meta doc
      const metaDoc = await db.collection('meta').doc('rootCollections').get();
      const collectionNames = (metaDoc.exists && metaDoc.data().collections) || [];
      sidebar.innerHTML = '';
      for (const name of collectionNames) {
        const div = document.createElement('div');
        div.className = 'explorer-folder';
        div.textContent = '/' + name;
        div.onclick = () => window.openFirestorePath([name]);
        sidebar.appendChild(div);
      }
      // Add "Create Collection" button
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add New Root Collection';
      addBtn.className = 'explorer-btn';
      addBtn.onclick = async () => {
        const name = prompt('Enter new collection name:');
        if (!name) return;
        // Create a dummy doc to make the collection exist
        await db.collection(name).add({ _created: new Date().toISOString() });
        // Update meta/rootCollections
        const metaRef = db.collection('meta').doc('rootCollections');
        await metaRef.set(
          { collections: Array.from(new Set([...collectionNames, name])) },
          { merge: true }
        );
        window.openFirestorePath([]);
      };
      sidebar.appendChild(addBtn);

      main.querySelector('.explorer-content').innerHTML = '<div style="color:#bbb;">Select a collection to view documents.</div>';
      return;
    }

    // Odd segments: COLLECTION (show documents)
    if (pathSegments.length % 2 === 1) {
      const colRef = db.collection(pathSegments.join('/'));
      const snapshot = await colRef.get();
      sidebar.innerHTML = '';
      main.querySelector('.explorer-content').innerHTML = '';
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const friendly = data.name || data.title || data.label || docSnap.id;
        const displayName = friendly ? friendly : `(ID: ${docSnap.id.slice(0, 6)}…)`;
        const docDiv = document.createElement('div');
        docDiv.className = 'explorer-doc';
        docDiv.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;">${displayName}</span>
            <span>
              <button class="explorer-btn" onclick="window.openFirestorePath(${JSON.stringify([...pathSegments, docSnap.id])})">Open</button>
              <button class="explorer-btn" onclick="window.editDoc('${pathSegments.join('/')}', '${docSnap.id}')">Edit</button>
              <button class="explorer-btn danger" onclick="window.deleteDocPrompt('${pathSegments.join('/')}', '${docSnap.id}')">Delete</button>
            </span>
          </div>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
        main.querySelector('.explorer-content').appendChild(docDiv);
      });
      // Add button to create new doc
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add New Document';
      addBtn.onclick = () => window.addDocPrompt(pathSegments.join('/'));
      main.querySelector('.explorer-content').appendChild(addBtn);

      // Bulk actions buttons
      const bulkDiv = document.createElement('div');
      bulkDiv.style.margin = '18px 0 8px 0';
      bulkDiv.innerHTML = `
        <button class="explorer-btn" onclick="window.showBulkAddModal('${pathSegments.join('/')}')">Bulk Add</button>
        <button class="explorer-btn danger" onclick="window.bulkDeleteSelected('${pathSegments.join('/')}')">Bulk Delete</button>
        <button class="explorer-btn" onclick="window.exportCollectionCSV('${pathSegments.join('/')}')">Export CSV</button>
        <button class="explorer-btn" onclick="window.importCSVModal('${pathSegments.join('/')}')">Import CSV</button>
      `;
      main.querySelector('.explorer-content').appendChild(bulkDiv);
      return;
    }

    // Even segments: DOCUMENT (show subcollections)
    let docPath = pathSegments.join('/');
    let subcollections = [];
    try {
      subcollections = await db.doc(docPath).listCollections();
    } catch (e) {
      sidebar.innerHTML = '<div style="color:#ff5050;">Error loading subcollections.</div>';
      console.error(e);
      return;
    }
    sidebar.innerHTML = '';
    for (const colRef of subcollections) {
      const div = document.createElement('div');
      div.className = 'explorer-folder';
      div.textContent = '/' + colRef.id;
      div.onclick = () => window.openFirestorePath([...pathSegments, colRef.id]);
      sidebar.appendChild(div);
    }
    // Show document data in main
    const docRef = db.doc(docPath);
    const docSnap = await docRef.get();
    const content = main.querySelector('.explorer-content');
    content.innerHTML = `<pre>${JSON.stringify(docSnap.data(), null, 2)}</pre>`;
    const btns = document.createElement('div');
    btns.innerHTML = `
      <button onclick="window.editDoc('${pathSegments.slice(0, -1).join('/')}', '${pathSegments[pathSegments.length - 1]}')">Edit</button>
      <button onclick="window.deleteDocPrompt('${pathSegments.slice(0, -1).join('/')}', '${pathSegments[pathSegments.length - 1]}')">Delete</button>
    `;
    content.appendChild(btns);

    // Audit Log button
    const auditBtn = document.createElement('button');
    auditBtn.className = 'explorer-btn';
    auditBtn.textContent = 'View Audit Log';
    auditBtn.style.marginTop = '16px';
    auditBtn.onclick = () => window.showAuditLogModal();
    main.querySelector('.explorer-content').appendChild(auditBtn);
  };

  // --- CRUD & BULK ACTIONS (COMPAT) ---

  window.addDocPrompt = async function(collectionPath) {
    showExplorerFormModal('Add New Document', {}, async (obj) => {
      try {
        const docRef = await db.collection(collectionPath).add(obj);
        await logAudit("add", `${collectionPath}/${docRef.id}`, sessionStorage.getItem('username') || 'unknown', null, obj);
        window.openFirestorePath(collectionPath.split('/'));
      } catch (e) {
        alert('Error adding document.');
      }
    });
  };

  window.editDoc = async function(collectionPath, docId) {
    const ref = db.collection(collectionPath).doc(docId);
    const docSnap = await ref.get();
    const before = docSnap.data();
    showExplorerFormModal('Edit Document', before || {}, async (obj) => {
      try {
        await ref.set(obj);
        await logAudit("edit", `${collectionPath}/${docId}`, sessionStorage.getItem('username') || 'unknown', before, obj);
        window.openFirestorePath(collectionPath.split('/'));
      } catch (e) {
        alert('Error saving document.');
      }
    });
  };

  window.deleteDocPrompt = async function(collectionPath, docId) {
    const ref = db.collection(collectionPath).doc(docId);
    const docSnap = await ref.get();
    const before = docSnap.data();
    if (!confirm('Delete this document?')) return;
    await ref.delete();
    await logAudit("delete", `${collectionPath}/${docId}`, sessionStorage.getItem('username') || 'unknown', before, null);
    window.openFirestorePath(collectionPath.split('/'));
  };

  async function logAudit(action, path, user, before, after) {
    try {
      await db.collection("audit_log").add({
        timestamp: new Date(),
        user,
        action,
        path,
        before,
        after
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  }

  window.showBulkAddModal = function(collectionPath) {
    let modal = document.getElementById('bulk-add-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bulk-add-modal';
      modal.style = 'display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999;background:rgba(0,0,0,0.45);align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#22345a;padding:28px 24px;border-radius:12px;min-width:320px;max-width:90vw;">
          <div style="font-weight:600;font-size:1.1em;margin-bottom:10px;">Bulk Add (Paste CSV rows below)</div>
          <textarea id="bulk-add-textarea" style="width:100%;height:160px;border-radius:7px;border:none;padding:10px;font-size:1em;background:#1c2942;color:#fff;"></textarea>
          <div style="margin-top:14px;text-align:right;">
            <button id="bulk-add-cancel" class="explorer-btn danger">Cancel</button>
            <button id="bulk-add-save" class="explorer-btn">Add</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const textarea = document.getElementById('bulk-add-textarea');
    textarea.value = '';
    modal.style.display = 'flex';

    function cleanup() {
      modal.style.display = 'none';
      document.getElementById('bulk-add-save').onclick = null;
      document.getElementById('bulk-add-cancel').onclick = null;
    }

    document.getElementById('bulk-add-save').onclick = async () => {
      const lines = textarea.value.trim().split('\n');
      if (!lines.length) return;
      const headers = lines[0].split(',').map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, idx) => obj[h] = values[idx]);
        const docRef = await db.collection(collectionPath).add(obj);
        await logAudit("add", `${collectionPath}/${docRef.id}`, sessionStorage.getItem('username') || 'unknown', null, obj);
      }
      cleanup();
      window.openFirestorePath(collectionPath.split('/'));
    };
    document.getElementById('bulk-add-cancel').onclick = cleanup;
  };

  window.bulkDeleteSelected = async function(collectionPath) {
    const checkboxes = document.querySelectorAll('.bulk-select:checked');
    if (!checkboxes.length) return alert('No documents selected.');
    if (!confirm(`Delete ${checkboxes.length} documents?`)) return;
    for (const cb of checkboxes) {
      await window.deleteDocPrompt(collectionPath, cb.dataset.docid);
    }
  };

  window.exportCollectionCSV = async function(collectionPath) {
    const colRef = db.collection(collectionPath);
    const snapshot = await colRef.get();
    if (snapshot.empty) return alert('No data to export.');
    const docs = [];
    snapshot.forEach(doc => docs.push(doc.data()));
    const headers = Object.keys(docs[0]);
    let csv = headers.join(',') + '\n';
    docs.forEach(doc => {
      csv += headers.map(h => `"${(doc[h] ?? '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collectionPath.replace(/\//g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.importCSVModal = function(collectionPath) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, idx) => obj[h] = values[idx]);
        const docRef = await db.collection(collectionPath).add(obj);
        await logAudit("add", `${collectionPath}/${docRef.id}`, sessionStorage.getItem('username') || 'unknown', null, obj);
      }
      window.openFirestorePath(collectionPath.split('/'));
      alert('Import complete!');
    };
    input.click();
  };

  window.showAuditLogModal = async function() {
    let modal = document.getElementById('audit-log-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'audit-log-modal';
      modal.style = 'display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999;background:rgba(0,0,0,0.45);align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#22345a;padding:28px 24px;border-radius:12px;min-width:320px;max-width:90vw;max-height:90vh;overflow:auto;">
          <div style="font-weight:600;font-size:1.1em;margin-bottom:10px;">Audit Log</div>
          <div id="audit-log-table" style="max-height:60vh;overflow:auto;"></div>
          <div style="margin-top:14px;text-align:right;">
            <button id="audit-log-close" class="explorer-btn danger">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const tableDiv = document.getElementById('audit-log-table');
    modal.style.display = 'flex';
    tableDiv.innerHTML = 'Loading...';
    const snapshot = await db.collection('audit_log').get();
    let html = `<table style="width:100%;font-size:0.97em;"><tr>
      <th>Time</th><th>User</th><th>Action</th><th>Path</th><th>Before</th><th>After</th>
    </tr>`;
    snapshot.forEach(doc => {
      const d = doc.data();
      html += `<tr>
        <td>${d.timestamp ? new Date(d.timestamp).toLocaleString() : ''}</td>
        <td>${d.user || ''}</td>
        <td>${d.action || ''}</td>
        <td style="font-family:monospace;">${d.path || ''}</td>
        <td><pre style="max-width:200px;overflow:auto;">${d.before ? JSON.stringify(d.before, null, 2) : ''}</pre></td>
        <td><pre style="max-width:200px;overflow:auto;">${d.after ? JSON.stringify(d.after, null, 2) : ''}</pre></td>
      </tr>`;
    });
    html += '</table>';
    tableDiv.innerHTML = html;
    document.getElementById('audit-log-close').onclick = () => { modal.style.display = 'none'; };
  };

  // --- FORM MODALS (COMPAT) ---

  function showExplorerFormModal(title, docData, onSave) {
    const modal = document.getElementById('explorer-form-modal');
    document.getElementById('explorer-form-title').textContent = title;
    const form = document.getElementById('explorer-form-fields');
    form.innerHTML = '';
    const keys = docData && Object.keys(docData).length ? Object.keys(docData) : [''];
    keys.forEach(key => {
      const value = docData ? docData[key] : '';
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.margin = '10px 0 4px 0';
      label.textContent = key || 'Field name';
      let input;
      if (typeof value === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.value = value;
      } else if (typeof value === 'boolean') {
        input = document.createElement('select');
        input.innerHTML = `<option value="true">true</option><option value="false">false</option>`;
        input.value = value ? 'true' : 'false';
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = value;
      }
      input.name = key;
      input.style.width = '100%';
      input.style.padding = '7px';
      input.style.borderRadius = '6px';
      input.style.border = 'none';
      input.style.background = '#1c2942';
      input.style.color = '#fff';
      input.style.fontSize = '1em';
      label.appendChild(input);
      form.appendChild(label);
    });
    const addFieldBtn = document.createElement('button');
    addFieldBtn.type = 'button';
    addFieldBtn.textContent = '+ Add Field';
    addFieldBtn.className = 'explorer-btn';
    addFieldBtn.style.marginTop = '10px';
    addFieldBtn.onclick = () => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.margin = '10px 0 4px 0';
      label.textContent = 'Field name';
      const input = document.createElement('input');
      input.type = 'text';
      input.name = '';
      input.value = '';
      input.style.width = '100%';
      input.style.padding = '7px';
      input.style.borderRadius = '6px';
      input.style.border = 'none';
      input.style.background = '#1c2942';
      input.style.color = '#fff';
      input.style.fontSize = '1em';
      label.appendChild(input);
      form.appendChild(label);
    };
    form.appendChild(addFieldBtn);
    modal.style.display = 'flex';
    function cleanup() {
      modal.style.display = 'none';
      form.onsubmit = null;
      document.getElementById('explorer-form-cancel').onclick = null;
    }
    form.onsubmit = (e) => {
      e.preventDefault();
      const inputs = Array.from(form.querySelectorAll('input, select'));
      const obj = {};
      for (const input of inputs) {
        const key = input.name.trim() || input.previousSibling.textContent.trim();
        if (!key) continue;
        if (input.type === 'number') {
          obj[key] = input.value === '' ? null : Number(input.value);
        } else if (input.tagName === 'SELECT') {
          obj[key] = input.value === 'true';
        } else {
          obj[key] = input.value;
        }
      }
      cleanup();
  loadFailedAssets();
  loadRecentInspections();
  loadAreaStatuses();

  // --- TEST CODE FOR NEW FIRESTORE STRUCTURE ---
  (async () => {
    // This writes a document to a root-level collection
    await db.collection('assetCategories').add({ name: 'New Category', description: 'Test category' });

    // This updates the meta/rootCollections doc at the root
    await db.collection('meta').doc('rootCollections').set(
      { collections: ['clients', 'inspections', 'assets', 'users', 'logs', 'analytics', 'billing', 'help', 'firebase', 'onboard', 'assetCategories'] },
      { merge: true }
    );
  })();

  async function deleteRootCollection(collectionName) {
    // Delete all docs in the collection
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Remove from meta/rootCollections
    const metaRef = db.collection('meta').doc('rootCollections');
    await db.runTransaction(async (transaction) => {
      const metaDoc = await transaction.get(metaRef);
      if (metaDoc.exists) {
        let collections = metaDoc.data().collections || [];
        collections = collections.filter(name => name !== collectionName);
        transaction.set(metaRef, { collections }, { merge: true });
      }
    });
  }

  document.getElementById('btn-manage-users').onclick = function() {
    window.showManageUsersModal(clientName); // pass the correct client name
  };

  document.getElementById('btn-users').addEventListener('click', function() {
    // Use the client name or ID from sessionStorage
    const clientName = sessionStorage.getItem('tenant_id');
    window.showManageUsersModal(clientName);
  });
});
