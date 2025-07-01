// ========== onboard.js ==========

import { db, storage } from './firebase.js';
import {
  collection, addDoc, setDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ========== SECURITY: Nexus Owner Only ==========
if (sessionStorage.role !== 'nexus') {
  document.body.innerHTML = '<div style="color:#fdd835;font-size:1.2em;margin:64px auto;max-width:380px;text-align:center;">Access Denied<br>This page is restricted to Nexus Owners.</div>';
  throw new Error("Not authorized");
}

// ========== MAIN: Modal Management ==========
function injectClientManagerModal() {
  if (!document.getElementById('clientManagerModal')) {
    const modal = document.createElement('div');
    modal.id = 'clientManagerModal';
    modal.style = `
      display:none;position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:9999;
      background:rgba(0,0,0,0.85);align-items:center;justify-content:center;
      overflow-y:auto;`;
    modal.innerHTML = `<div id="clientManagerModalContent"></div>`;
    document.body.appendChild(modal);
  }
}
injectClientManagerModal();
if (document.getElementById('manageClientsBtn')) {
  document.getElementById('manageClientsBtn').onclick = function () {
    document.getElementById('clientManagerModal').style.display = 'flex';
    renderClientManager();
  };
}
document.addEventListener('keydown', e => {
  if (e.key === "Escape") closeClientManagerModal();
});
document.body.addEventListener('mousedown', e => {
  const modal = document.getElementById('clientManagerModal');
  if (modal && modal.style.display !== "none" && e.target === modal) closeClientManagerModal();
});
function closeClientManagerModal() {
  const modal = document.getElementById('clientManagerModal');
  if (modal) modal.style.display = 'none';
}
window.closeClientManagerModal = closeClientManagerModal;

// ========== Main Modal (Tabbed Admin Hub) ==========
async function renderClientManager() {
  const modalContent = document.getElementById('clientManagerModalContent');
  modalContent.innerHTML = `
    <h2 style="color:#36ff71;margin-bottom:18px;text-align:center;">Client Manager</h2>
    <div style="margin-bottom:18px;text-align:center;">
      <label for="cmClientSelect" style="color:#36ff71;font-size:1.08em;font-weight:600;">Select Client:</label><br>
      <select id="cmClientSelect" style="margin-top:10px;font-size:1.1em;padding:8px 14px;border-radius:8px;background:#161f17;color:#36ff71;border:2px solid #36ff71;">
        <option value="all">All</option>
      </select>
    </div>
    <div style="display:flex;justify-content:center;gap:14px;margin-bottom:30px;">
      <button class="cm-tab-btn neon-tab" id="tab-users" style="border-bottom:3px solid #36ff71;">Users</button>
      <button class="cm-tab-btn neon-tab" id="tab-assets">Assets</button>
      <button class="cm-tab-btn neon-tab" id="tab-locations">Locations</button>
      <button class="cm-tab-btn neon-tab" id="tab-questiontemplates">Templates</button>
      <button class="cm-tab-btn neon-tab" id="tab-inspections">Logs</button>
      <button class="cm-tab-btn neon-tab" id="tab-messenger">Messenger</button>
      <button class="cm-tab-btn neon-tab" id="tab-bulk">Bulk Ops</button>
      <button class="cm-tab-btn neon-tab" id="tab-dueDates">Due Dates</button>
    </div>
    <div id="cmTabPanel"></div>
    <button class="manage-btn" onclick="window.closeClientManagerModal()" style="margin:38px auto 0 auto;display:block;">Close</button>
    <style>
      .cm-tab-btn {
        background:none;
        color:#36ff71;
        border:none;
        font-size:1.18em;
        font-family:'Oswald',sans-serif;
        cursor:pointer;
        padding:8px 28px 7px 28px;
        border-radius:9px 9px 0 0;
        transition:background 0.13s, color 0.13s;
        box-shadow:0 2px 8px #36ff7142 inset;
        margin:0;
      }
      .cm-tab-btn:hover, .cm-tab-btn.active {
        background:#122e1b;
        color:#aaffc3;
      }
      .neon-tab {box-shadow:0 0 8px #36ff7150;}
    </style>
  `;
  await populateClientDropdown();
  await renderClientTabPanel("users", document.getElementById('cmClientSelect').value);

  // Tab switching logic
  document.getElementById('tab-users').onclick = async function() {
    setTabActive("users");
    await renderClientTabPanel("users", document.getElementById('cmClientSelect').value);
  };
  document.getElementById('tab-assets').onclick = async function() {
    setTabActive("assets");
    await renderClientTabPanel("assets", document.getElementById('cmClientSelect').value);
  };
  document.getElementById('tab-locations').onclick = async function() {
    setTabActive("locations");
    await renderClientTabPanel("locations", document.getElementById('cmClientSelect').value);
  };
  document.getElementById('tab-questiontemplates').onclick = async function() {
    setTabActive("questiontemplates");
    await renderClientTabPanel("questiontemplates", document.getElementById('cmClientSelect').value);
  };
  document.getElementById('tab-inspections').onclick = async function() {
    setTabActive("inspections");
    await renderClientTabPanel("inspections", document.getElementById('cmClientSelect').value);
  };
  document.getElementById('tab-messenger').onclick = async function() {
    setTabActive("messenger");
    await renderClientTabPanel("messenger", document.getElementById('cmClientSelect').value);
  };
  document.getElementById('tab-bulk').onclick = async function() {
    setTabActive("bulk");
    await renderClientTabPanel("bulk", document.getElementById('cmClientSelect').value);
  };
  document.getElementById('cmClientSelect').onchange = async function() {
    const tab = document.querySelector('.cm-tab-btn[style*="border-bottom"]').id.replace('tab-','');
    await renderClientTabPanel(tab, this.value);
  };

  function setTabActive(tab) {
    for (const t of ['users','assets','locations','questiontemplates','inspections','messenger','bulk'])
      document.getElementById('tab-'+t).style.borderBottom = "";
    document.getElementById('tab-'+tab).style.borderBottom = "3px solid #36ff71";
  }
}

// ====== Dropdown Populate ======
async function populateClientDropdown() {
  const select = document.getElementById('cmClientSelect');
  select.innerHTML = `<option value="all">All</option>`;
  const snap = await getDocs(collection(db, "clients"));
  snap.forEach(docSnap => {
    const c = docSnap.data();
    select.innerHTML += `<option value="${docSnap.id}">${c.name || docSnap.id}</option>`;
  });
}

// ====== Main Tab Panel Routing ======
async function renderClientTabPanel(tab, clientId) {
  if (tab === "users")     await renderUsersPanel(clientId);
  if (tab === "assets")    await renderAssetsPanel(clientId);
  if (tab === "locations") await renderLocationsPanel(clientId);
  if (tab === "questiontemplates") await renderQuestionTemplatesPanel(clientId);
  if (tab === "inspections") await renderInspectionsPanel(clientId);
  if (tab === "messenger") await renderMessengerPanel(clientId);
  if (tab === "bulk") await renderBulkOpsPanel(clientId);
}
// ======== USERS PANEL (with assignment) ========
async function renderUsersPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  panel.innerHTML = `<div style="color:#36ff71;text-align:center;">Loading users...</div>`;
  let html = "";
  let clients = [];

  if (clientId === "all") {
    const snap = await getDocs(collection(db, "clients"));
    clients = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } else {
    const docSnap = await getDoc(doc(db, "clients", clientId));
    clients = [{ id: docSnap.id, ...docSnap.data() }];
  }

  for (const client of clients) {
    const userSnap = await getDocs(collection(db, `clients/${client.id}/users`));
    if (!userSnap.size) continue;
    html += `<div style="margin:24px 0 8px 0;font-weight:600;color:#50ff9a;">${client.name || client.id}</div>`;
    html += "<table style='width:100%;margin-bottom:22px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;'><thead><tr>" +
      "<th>Username</th><th>Name</th><th>Role</th><th>Assignments</th><th>Actions</th></tr></thead><tbody>";
    for (const userDoc of userSnap.docs) {
      const u = userDoc.data();
      if (u.deleted) continue;
      // Show assignments summary for the user
      html += `<tr>
        <td>${u.username}</td>
        <td>${u.first_name || ""} ${u.last_name || ""}</td>
        <td>${u.role || ""}</td>
        <td><button onclick="window.showUserAssignments('${client.id}','${userDoc.id}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">View</button></td>
        <td>
          <button onclick="editUser('${client.id}','${userDoc.id}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">Edit</button>
          <button onclick="deleteUser('${client.id}','${userDoc.id}')" style="color:#f00;background:none;border:none;cursor:pointer;">Delete</button>
        </td>
      </tr>`;
    }
    html += "</tbody></table>";
  }
  html += `<button class="manage-btn" style="margin-top:7px;" onclick="showAddUserModal('${clientId}')">Add User</button>`;
  panel.innerHTML = html || "<div style='color:#36ff71'>No users found.</div>";
}

// --- User Assignment Modal (Assign assets/zones/types) ---
window.showUserAssignments = async function(clientId, userId) {
  let modal = document.getElementById('userAssignmentModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'userAssignmentModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1220;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  // Get all assets for assignment (can also load zones/types if you want)
  const assetsSnap = await getDocs(collection(db, `clients/${clientId}/assets`));
  const assignmentsSnap = await getDocs(collection(db, `clients/${clientId}/users/${userId}/assignments`));
  const assignedAssetIds = assignmentsSnap.docs.map(doc => doc.data().assetId);

  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:340px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">User Assignments</h2>
      <form id="assignmentForm">
        <label style="color:#36ff71;">Assign assets (by check):</label>
        <div style="max-height:220px;overflow-y:auto;border:1px solid #36ff71;border-radius:8px;padding:8px;background:#161d16;">
          ${assetsSnap.docs.map(docSnap => {
            const a = docSnap.data();
            if (a.deleted) return '';
            return `<div><input type="checkbox" name="assignAsset" value="${docSnap.id}" ${assignedAssetIds.includes(docSnap.id) ? 'checked' : ''}> ${a.name || a.asset_id || docSnap.id}</div>`;
          }).join('')}
        </div>
        <button type="submit" class="manage-btn" style="width:100%;margin-top:16px;">Save Assignments</button>
        <div id="assignmentMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeUserAssignmentModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Close</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('assignmentForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('assignmentMsg');
    msg.textContent = "Saving...";
    // Remove all assignments, re-add current
    try {
      // Delete existing
      for (const docRef of assignmentsSnap.docs) {
        await updateDoc(doc(db, `clients/${clientId}/users/${userId}/assignments/${docRef.id}`), { deleted: true });
      }
      // Add new
      const checked = Array.from(document.querySelectorAll('input[name="assignAsset"]:checked')).map(cb => cb.value);
      for (const assetId of checked) {
        await setDoc(doc(db, `clients/${clientId}/users/${userId}/assignments/${assetId}`), {
          assetId, assignedAt: serverTimestamp(), deleted: false
        });
      }
      msg.textContent = "Assignments updated!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeUserAssignmentModal();
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeUserAssignmentModal = function() {
  let modal = document.getElementById('userAssignmentModal');
  if (modal) modal.style.display = "none";
};

// -- Add, Edit, Delete User modals -- (identical to your existing logic, omitted for brevity but include in your final file)

// ======== ASSETS PANEL (with template assignment) ========
async function renderAssetsPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  panel.innerHTML = `<div style="color:#36ff71;text-align:center;">Loading assets...</div>`;
  let html = "";

  let clients = [];
  if (clientId === "all") {
    const snap = await getDocs(collection(db, "clients"));
    clients = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  } else {
    const docSnap = await getDoc(doc(db, "clients", clientId));
    clients = [{ id: docSnap.id, ...docSnap.data() }];
  }
  // For template assignment:
  const qtsnap = await getDocs(collection(db, "questionTemplates"));
  const templates = qtsnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  for (const client of clients) {
    const assetSnap = await getDocs(collection(db, `clients/${client.id}/assets`));
    if (!assetSnap.size) continue;
    html += `<div style="margin:24px 0 8px 0;font-weight:600;color:#50ff9a;">${client.name || client.id}</div>`;
    html += `<table style='width:100%;margin-bottom:22px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;'><thead><tr>
      <th>Name</th><th>Type</th><th>Location</th><th>Assigned User</th><th>Status</th><th>Template</th><th>Actions</th>
      </tr></thead><tbody>`;
    for (const assetDoc of assetSnap.docs) {
      const a = assetDoc.data();
      if (a.deleted) continue;
      const tmpl = templates.find(t => t.id === a.questionTemplateId);
      html += `<tr>
        <td>${a.name || a.asset_id || assetDoc.id}</td>
        <td>${a.type || ""}</td>
        <td>${a.location || ""}</td>
        <td>${a.assigned_user || ""}</td>
        <td>${a.status || ""}</td>
        <td>${tmpl ? tmpl.name : "-"}</td>
        <td>
          <button onclick="editAsset('${client.id}','${assetDoc.id}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">Edit</button>
          <button onclick="deleteAsset('${client.id}','${assetDoc.id}')" style="color:#f00;background:none;border:none;cursor:pointer;">Delete</button>
        </td>
      </tr>`;
    }
    html += "</tbody></table>";
  }
  html += `<button class="manage-btn" style="margin-top:7px;" onclick="showAddAssetModal('${clientId}')">Add Asset</button>`;
  panel.innerHTML = html || "<div style='color:#36ff71'>No assets found.</div>";
}

// -- Add/Edit/Delete Asset modals --
// In Add/Edit Asset modal, add a dropdown for templates:
async function renderAssetTemplateDropdown(selectedId="") {
  const qtsnap = await getDocs(collection(db, "questionTemplates"));
  return `<label style="color:#36ff71;">Inspection Template</label>
    <select id="assetTemplateSelect" required>
      <option value="">Select Template</option>
      ${qtsnap.docs.map(qt => `<option value="${qt.id}" ${selectedId===qt.id ? "selected":""}>${qt.data().name}</option>`).join('')}
    </select>`;
}

// ======== LOCATIONS PANEL ========
async function renderLocationsPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  panel.innerHTML = `<div style="color:#36ff71;text-align:center;">Loading locations...</div>`;
  let html = "";

  let clients = [];
  if (clientId === "all") {
    html = `<div style="color:#fff;text-align:center;margin:40px 0;">
      Please select a client to manage locations.
    </div>`;
    panel.innerHTML = html;
    return;
  }
  const docSnap = await getDoc(doc(db, "clients", clientId));
  clients = [{ id: docSnap.id, ...docSnap.data() }];

  for (const client of clients) {
    const locSnap = await getDocs(collection(db, `clients/${client.id}/locations`));
    html += `<table style="width:100%;margin-bottom:18px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;">
      <thead>
        <tr>
          <th>Location Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>`;
    let count = 0;
    for (const locDoc of locSnap.docs) {
      const loc = locDoc.data();
      if (loc.deleted) continue;
      html += `<tr>
        <td>${loc.name || ""}</td>
        <td>
          <button onclick="editLocation('${client.id}','${locDoc.id}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">Edit</button>
          <button onclick="deleteLocation('${client.id}','${locDoc.id}')" style="color:#f00;background:none;border:none;cursor:pointer;">Delete</button>
        </td>
      </tr>`;
      count++;
    }
    if (!count) {
      html += `<tr><td colspan="2" style="color:#36ff71;text-align:center;">No locations found.</td></tr>`;
    }
    html += `</tbody></table>`;
    html += `<button class="manage-btn" style="margin:auto;display:block;" onclick="showAddLocationModal('${client.id}')">Add Location</button>`;
  }
  panel.innerHTML = html;
}

// ---- Reminder: Add/Edit/Delete modals for Users, Assets, Locations go here (re-use your working code!) ----
// ========= QUESTION TEMPLATES PANEL ==========
async function renderQuestionTemplatesPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  panel.innerHTML = `<div style="color:#36ff71;text-align:center;">Loading templates...</div>`;
  let html = "";

  const qtsnap = await getDocs(collection(db, "questionTemplates"));
  html += `<button class="manage-btn" style="margin-bottom:15px;" onclick="showAddTemplateModal()">Add Template</button>`;
  html += `<table style="width:100%;margin-bottom:18px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;">
    <thead>
      <tr>
        <th>Name</th><th>Asset Type</th><th>Frequency</th><th>Questions</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>`;
  let count = 0;
  for (const qtDoc of qtsnap.docs) {
    const qt = qtDoc.data();
    html += `<tr>
      <td>${qt.name || ""}</td>
      <td>${qt.assetType || ""}</td>
      <td>${qt.frequency || ""}</td>
      <td><button style="color:#36ff71;background:none;border:none;cursor:pointer;" onclick="window.previewTemplate('${qtDoc.id}')">View</button></td>
      <td>
        <button onclick="window.editTemplate('${qtDoc.id}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">Edit</button>
        <button onclick="window.deleteTemplate('${qtDoc.id}')" style="color:#f00;background:none;border:none;cursor:pointer;">Delete</button>
      </td>
    </tr>`;
    count++;
  }
  if (!count) html += `<tr><td colspan="5" style="color:#36ff71;text-align:center;">No templates found.</td></tr>`;
  html += `</tbody></table>`;
  panel.innerHTML = html;
}

// --- Add Template Modal ---
window.showAddTemplateModal = function() {
  let modal = document.getElementById('templateModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'templateModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1222;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:350px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Add Question Template</h2>
      <form id="addTemplateForm">
        <label style="color:#36ff71;">Name</label>
        <input id="qtName" type="text" required>
        <label style="color:#36ff71;">Asset Type</label>
        <input id="qtAssetType" type="text" required>
        <label style="color:#36ff71;">Frequency</label>
        <input id="qtFrequency" type="text" required>
        <label style="color:#36ff71;">Questions<br><span style="color:#aaa;font-size:0.88em;">(One per line)</span></label>
        <textarea id="qtQuestions" required style="width:100%;height:110px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;margin-bottom:15px;"></textarea>
        <button type="submit" class="manage-btn" style="width:100%;margin-top:10px;">Add</button>
        <div id="addTemplateMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeTemplateModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('addTemplateForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('addTemplateMsg');
    msg.textContent = "Adding...";
    try {
      await addDoc(collection(db, "questionTemplates"), {
        name: document.getElementById('qtName').value.trim(),
        assetType: document.getElementById('qtAssetType').value.trim(),
        frequency: document.getElementById('qtFrequency').value.trim(),
        questions: document.getElementById('qtQuestions').value.trim().split('\n').map(q => q.trim()).filter(q => q),
        created_at: serverTimestamp()
      });
      msg.textContent = "Template added!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeTemplateModal();
        renderQuestionTemplatesPanel("all");
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeTemplateModal = function() {
  let modal = document.getElementById('templateModal');
  if (modal) modal.style.display = "none";
};

// --- Preview Template Modal ---
window.previewTemplate = async function(templateId) {
  const qtDoc = await getDoc(doc(db, "questionTemplates", templateId));
  if (!qtDoc.exists()) return;
  const qt = qtDoc.data();
  let modal = document.getElementById('templatePreviewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'templatePreviewModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1223;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:340px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">${qt.name}</h2>
      <div style="color:#fff;font-size:1.1em;margin-bottom:17px;">
        <b>Asset Type:</b> ${qt.assetType} <br>
        <b>Frequency:</b> ${qt.frequency}
      </div>
      <div style="max-height:260px;overflow:auto;border:1px solid #36ff71;padding:8px 15px;border-radius:10px;background:#131b17;">
        <ol>
          ${qt.questions.map(q => `<li>${q}</li>`).join('')}
        </ol>
      </div>
      <button onclick="window.closeTemplatePreviewModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Close</button>
    </div>
  `;
  modal.style.display = "flex";
};
window.closeTemplatePreviewModal = function() {
  let modal = document.getElementById('templatePreviewModal');
  if (modal) modal.style.display = "none";
};

// ========= INSPECTION LOGS PANEL ==========
async function renderInspectionsPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  panel.innerHTML = `<div style="color:#36ff71;text-align:center;">Loading logs...</div>`;
  let html = "";

  let logs = [];
  if (clientId === "all") {
    const clientsSnap = await getDocs(collection(db, "clients"));
    for (const clientDoc of clientsSnap.docs) {
      const assetSnap = await getDocs(collection(db, `clients/${clientDoc.id}/assets`));
      for (const assetDoc of assetSnap.docs) {
        const logsSnap = await getDocs(collection(db, `clients/${clientDoc.id}/assets/${assetDoc.id}/logs`));
        for (const logDoc of logsSnap.docs) {
          logs.push({ ...logDoc.data(), logId: logDoc.id, assetId: assetDoc.id, clientId: clientDoc.id, assetName: assetDoc.data().name || assetDoc.id });
        }
      }
    }
  } else {
    const assetSnap = await getDocs(collection(db, `clients/${clientId}/assets`));
    for (const assetDoc of assetSnap.docs) {
      const logsSnap = await getDocs(collection(db, `clients/${clientId}/assets/${assetDoc.id}/logs`));
      for (const logDoc of logsSnap.docs) {
        logs.push({ ...logDoc.data(), logId: logDoc.id, assetId: assetDoc.id, clientId, assetName: assetDoc.data().name || assetDoc.id });
      }
    }
  }
  logs = logs.sort((a,b) => (b.date||"").localeCompare(a.date||""));

  html += `<table style="width:100%;margin-bottom:18px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;">
    <thead>
      <tr>
        <th>Date</th><th>Asset</th><th>User</th><th>Status</th><th>Notes</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>`;
  if (!logs.length) {
    html += `<tr><td colspan="6" style="color:#36ff71;text-align:center;">No logs found.</td></tr>`;
  } else {
    for (const log of logs) {
      html += `<tr>
        <td>${log.date ? (log.date.toDate ? log.date.toDate().toLocaleString() : new Date(log.date).toLocaleString()) : "-"}</td>
        <td>${log.assetName}</td>
        <td>${log.inspectedByName || log.inspectedBy || "-"}</td>
        <td>${log.status || "-"}</td>
        <td>${log.notes || "-"}</td>
        <td>
          <button onclick="window.previewInspectionLog('${log.clientId}','${log.assetId}','${log.logId}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">View</button>
        </td>
      </tr>`;
    }
  }
  html += `</tbody></table>`;
  panel.innerHTML = html;
}

// --- Preview Log Modal (Print/PDF ready) ---
window.previewInspectionLog = async function(clientId, assetId, logId) {
  const logDoc = await getDoc(doc(db, `clients/${clientId}/assets/${assetId}/logs/${logId}`));
  if (!logDoc.exists()) return;
  const log = logDoc.data();
  let modal = document.getElementById('logPreviewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'logPreviewModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1230;
      background:rgba(10,30,12,0.97);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:350px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:15px;">Inspection Log</h2>
      <div style="color:#fff;font-size:1.08em;margin-bottom:11px;">
        <b>Asset:</b> ${log.assetName || assetId} <br>
        <b>Inspected By:</b> ${log.inspectedByName || log.inspectedBy || "-"} <br>
        <b>Date:</b> ${log.date ? (log.date.toDate ? log.date.toDate().toLocaleString() : new Date(log.date).toLocaleString()) : "-"}
      </div>
      <div style="max-height:260px;overflow:auto;border:1px solid #36ff71;padding:8px 15px;border-radius:10px;background:#131b17;">
        <table style="width:100%;color:#fff;">
          <thead>
            <tr><th style="text-align:left;">Question</th><th>Answer</th></tr>
          </thead>
          <tbody>
            ${(log.answers || []).map(a => `<tr>
              <td>${a.question}</td>
              <td style="text-align:center;">${a.answer === true ? "✅ Yes" : a.answer === false ? "❌ No" : (a.answer||"-")}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="color:#fff;font-size:1.08em;margin-top:14px;">
        <b>Status:</b> ${log.status || "-"} <br>
        <b>Notes:</b> ${log.notes || "-"}
      </div>
      <button onclick="window.closeLogPreviewModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Close</button>
    </div>
  `;
  modal.style.display = "flex";
};
window.closeLogPreviewModal = function() {
  let modal = document.getElementById('logPreviewModal');
  if (modal) modal.style.display = "none";
};

// ========= MESSENGER PANEL ==========
async function renderMessengerPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  if (clientId === "all") {
    panel.innerHTML = `<div style="color:#36ff71;text-align:center;">Select a client to open messenger.</div>`;
    return;
  }
  // Load all messages for client
  const msgsRef = collection(db, `clients/${clientId}/messages`);
  const q = query(msgsRef, orderBy("timestamp", "asc"));
  const msgsSnap = await getDocs(q);
  panel.innerHTML = `
    <div style="max-width:500px;margin:0 auto;">
      <div id="chatMessages" style="background:#101914;padding:18px;border-radius:14px;max-height:340px;overflow-y:auto;margin-bottom:15px;">
        ${msgsSnap.docs.map(doc => {
          const m = doc.data();
          return `<div style="margin-bottom:10px;">
            <b style="color:#36ff71">${m.from || "System"}:</b>
            <span style="color:#fff">${m.text}</span>
            <span style="color:#7bf;"> <i>${m.timestamp ? (m.timestamp.toDate ? m.timestamp.toDate().toLocaleString() : m.timestamp) : ""}</i></span>
          </div>`;
        }).join('')}
      </div>
      <form id="chatForm" style="display:flex;gap:8px;">
        <input id="chatInput" type="text" style="flex:1;padding:8px 12px;border-radius:8px;border:none;background:#172719;color:#fff;" placeholder="Message..." required>
        <button type="submit" style="padding:8px 18px;border-radius:8px;background:#36ff71;color:#102914;border:none;cursor:pointer;font-weight:600;">Send</button>
      </form>
    </div>
  `;
  document.getElementById('chatForm').onsubmit = async function(e) {
    e.preventDefault();
    const text = document.getElementById('chatInput').value.trim();
    if (!text) return;
    await addDoc(collection(db, `clients/${clientId}/messages`), {
      text,
      from: "Nexus Owner",
      timestamp: serverTimestamp()
    });
    await renderMessengerPanel(clientId); // Refresh chat
  };
}

// ========= BULK OPS PANEL ==========
async function renderBulkOpsPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  panel.innerHTML = `
    <div style="color:#36ff71;text-align:center;">Bulk Operations</div>
    <div style="margin:28px auto;max-width:420px;text-align:center;">
      <button class="manage-btn" onclick="window.showBulkImportModal('${clientId}')">Bulk Import Assets</button>
      <button class="manage-btn" onclick="window.showBulkExportModal('${clientId}')" style="margin-top:18px;">Export All Assets</button>
      <div id="bulkOpsMsg" style="margin-top:17px;"></div>
    </div>
  `;
}

// --- Bulk Import Modal (CSV/JSON input for assets) ---
window.showBulkImportModal = function(clientId) {
  let modal = document.getElementById('bulkImportModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bulkImportModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1300;
      background:rgba(10,30,12,0.98);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 54px #36ff719a;padding:38px 42px;min-width:340px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:15px;">Bulk Import Assets</h2>
      <form id="bulkImportForm">
        <label style="color:#36ff71;">Paste JSON array of assets:</label>
        <textarea id="bulkAssetInput" style="width:100%;height:120px;background:#131b17;color:#fff;border-radius:7px;border:1.5px solid #36ff71;margin-bottom:14px;"></textarea>
        <button type="submit" class="manage-btn" style="width:100%;">Import</button>
        <div id="bulkImportMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeBulkImportModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Close</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('bulkImportForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('bulkImportMsg');
    msg.textContent = "Importing...";
    try {
      const arr = JSON.parse(document.getElementById('bulkAssetInput').value);
      if (!Array.isArray(arr)) throw new Error("JSON must be an array of asset objects.");
      for (const asset of arr) {
        await addDoc(collection(db, `clients/${clientId}/assets`), {
          ...asset, created_at: serverTimestamp()
        });
      }
      msg.textContent = "Imported!";
      msg.style.color = "#36ff71";
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeBulkImportModal = function() {
  let modal = document.getElementById('bulkImportModal');
  if (modal) modal.style.display = "none";
};

// --- Bulk Export Modal (simple JSON download) ---
window.showBulkExportModal = async function(clientId) {
  let modal = document.getElementById('bulkExportModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bulkExportModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1300;
      background:rgba(10,30,12,0.98);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div style="background:#101b13;border-radius:20px;box-shadow:0 0 54px #36ff719a;padding:38px 42px;min-width:340px;max-width:92vw;">
    <h2 style="color:#36ff71;text-align:center;margin-bottom:15px;">Export All Assets</h2>
    <div id="exportJsonBox" style="background:#161e1c;color:#fff;padding:12px 10px;border-radius:8px;max-height:230px;overflow-y:auto;font-size:0.99em;"></div>
    <button onclick="window.downloadExportJson()" class="manage-btn" style="margin:16px 0 0 0;width:90%;">Download JSON</button>
    <button onclick="window.closeBulkExportModal()" class="manage-btn" style="margin:14px 0 0 0;width:90%;">Close</button>
  </div>`;
  modal.style.display = "flex";
  // Gather assets and show as JSON
  let assets = [];
  if (clientId && clientId !== "all") {
    const snap = await getDocs(collection(db, `clients/${clientId}/assets`));
    snap.forEach(doc => assets.push(doc.data()));
  }
  document.getElementById('exportJsonBox').innerText = JSON.stringify(assets, null, 2);
  window._bulkExportJsonData = assets;
};
window.closeBulkExportModal = function() {
  let modal = document.getElementById('bulkExportModal');
  if (modal) modal.style.display = "none";
};
window.downloadExportJson = function() {
  const data = window._bulkExportJsonData || [];
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = "nexus-assets-export.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// ======== EDIT/DELETE TEMPLATE ========
window.editTemplate = async function(templateId) {
  const qtDoc = await getDoc(doc(db, "questionTemplates", templateId));
  if (!qtDoc.exists()) return;
  const qt = qtDoc.data();
  let modal = document.getElementById('templateModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'templateModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1222;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:350px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Edit Question Template</h2>
      <form id="editTemplateForm">
        <label style="color:#36ff71;">Name</label>
        <input id="qtName" type="text" value="${qt.name || ''}" required>
        <label style="color:#36ff71;">Asset Type</label>
        <input id="qtAssetType" type="text" value="${qt.assetType || ''}" required>
        <label style="color:#36ff71;">Frequency</label>
        <input id="qtFrequency" type="text" value="${qt.frequency || ''}" required>
        <label style="color:#36ff71;">Questions<br><span style="color:#aaa;font-size:0.88em;">(One per line)</span></label>
        <textarea id="qtQuestions" required style="width:100%;height:110px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;margin-bottom:15px;">${(qt.questions||[]).join('\n')}</textarea>
        <button type="submit" class="manage-btn" style="width:100%;margin-top:10px;">Save</button>
        <div id="editTemplateMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeTemplateModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('editTemplateForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('editTemplateMsg');
    msg.textContent = "Saving...";
    try {
      await updateDoc(doc(db, "questionTemplates", templateId), {
        name: document.getElementById('qtName').value.trim(),
        assetType: document.getElementById('qtAssetType').value.trim(),
        frequency: document.getElementById('qtFrequency').value.trim(),
        questions: document.getElementById('qtQuestions').value.trim().split('\n').map(q => q.trim()).filter(q => q)
      });
      msg.textContent = "Template updated!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeTemplateModal();
        renderQuestionTemplatesPanel("all");
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};

window.deleteTemplate = async function(templateId) {
  if (!confirm('Delete this template?')) return;
  try {
    await updateDoc(doc(db, "questionTemplates", templateId), { deleted: true });
    await renderQuestionTemplatesPanel("all");
  } catch (err) {
    alert("Error deleting template: " + (err.message || "Unknown error"));
  }
};

// ======== EDIT/DELETE LOCATION ========
window.editLocation = async function(clientId, locationId) {
  const locDoc = await getDoc(doc(db, `clients/${clientId}/locations/${locationId}`));
  if (!locDoc.exists()) return;
  const loc = locDoc.data();
  let modal = document.getElementById('locationModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'locationModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1240;
      background:rgba(10,30,12,0.95);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 34px #36ff719a;padding:38px 42px;min-width:350px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Edit Location</h2>
      <form id="editLocationForm">
        <label style="color:#36ff71;">Name</label>
        <input id="locName" type="text" value="${loc.name || ''}" required>
        <button type="submit" class="manage-btn" style="width:100%;margin-top:10px;">Save</button>
        <div id="editLocationMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeLocationModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('editLocationForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('editLocationMsg');
    msg.textContent = "Saving...";
    try {
      await updateDoc(doc(db, `clients/${clientId}/locations/${locationId}`), {
        name: document.getElementById('locName').value.trim()
      });
      msg.textContent = "Location updated!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeLocationModal();
        renderLocationsPanel(clientId);
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeLocationModal = function() {
  let modal = document.getElementById('locationModal');
  if (modal) modal.style.display = "none";
};

window.deleteLocation = async function(clientId, locationId) {
  if (!confirm('Delete this location?')) return;
  try {
    await updateDoc(doc(db, `clients/${clientId}/locations/${locationId}`), { deleted: true });
    await renderLocationsPanel(clientId);
  } catch (err) {
    alert("Error deleting location: " + (err.message || "Unknown error"));
  }
};

// ======== ADD/EDIT/DELETE USER MODALS (STUBS, EXPAND AS NEEDED) ========
window.showAddUserModal = function(clientId) {
  let modal = document.getElementById('userModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'userModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1250;
      background:rgba(10,30,12,0.97);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:18px;box-shadow:0 0 30px #36ff719a;padding:36px 36px;min-width:320px;max-width:90vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:17px;">Add User</h2>
      <form id="addUserForm">
        <label style="color:#36ff71;">Username</label>
        <input id="newUsername" type="text" required>
        <label style="color:#36ff71;">First Name</label>
        <input id="newFirstName" type="text" required>
        <label style="color:#36ff71;">Last Name</label>
        <input id="newLastName" type="text" required>
        <label style="color:#36ff71;">Role</label>
        <select id="newUserRole" required>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <label style="color:#36ff71;">Password</label>
        <input id="newPassword" type="password" required>
        <button type="submit" class="manage-btn" style="width:100%;margin-top:12px;">Add</button>
        <div id="addUserMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeUserModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('addUserForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('addUserMsg');
    msg.textContent = "Adding...";
    try {
      await addDoc(collection(db, `clients/${clientId}/users`), {
        username: document.getElementById('newUsername').value.trim(),
        first_name: document.getElementById('newFirstName').value.trim(),
        last_name: document.getElementById('newLastName').value.trim(),
        role: document.getElementById('newUserRole').value,
        password: document.getElementById('newPassword').value.trim(),
        created_at: serverTimestamp(),
        deleted: false
      });
      msg.textContent = "User added!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeUserModal();
        renderUsersPanel(clientId);
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeUserModal = function() {
  let modal = document.getElementById('userModal');
  if (modal) modal.style.display = "none";
};

// (Expand editUser, deleteUser with similar logic.)

// ======== ADD/EDIT/DELETE ASSET MODALS (STUBS, EXPAND AS NEEDED) ========
window.showAddAssetModal = async function(clientId) {
  let modal = document.getElementById('assetModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assetModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1260;
      background:rgba(10,30,12,0.97);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  // Template dropdown
  const templateDropdown = await renderAssetTemplateDropdown();
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:18px;box-shadow:0 0 30px #36ff719a;padding:36px 36px;min-width:320px;max-width:90vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:17px;">Add Asset</h2>
      <form id="addAssetForm">
        <label style="color:#36ff71;">Name</label>
        <input id="assetName" type="text" required>
        <label style="color:#36ff71;">Type</label>
        <input id="assetType" type="text" required>
        <label style="color:#36ff71;">Location</label>
        <input id="assetLocation" type="text">
        <label style="color:#36ff71;">Status</label>
        <input id="assetStatus" type="text">
        ${templateDropdown}
        <button type="submit" class="manage-btn" style="width:100%;margin-top:12px;">Add</button>
        <div id="addAssetMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeAssetModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('addAssetForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('addAssetMsg');
    msg.textContent = "Adding...";
    try {
      await addDoc(collection(db, `clients/${clientId}/assets`), {
        name: document.getElementById('assetName').value.trim(),
        type: document.getElementById('assetType').value.trim(),
        location: document.getElementById('assetLocation').value.trim(),
        status: document.getElementById('assetStatus').value.trim(),
        questionTemplateId: document.getElementById('assetTemplateSelect').value,
        created_at: serverTimestamp(),
        deleted: false
      });
      msg.textContent = "Asset added!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeAssetModal();
        renderAssetsPanel(clientId);
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeAssetModal = function() {
  let modal = document.getElementById('assetModal');
  if (modal) modal.style.display = "none";
};

// (Expand editAsset, deleteAsset with similar logic.)

window.editUser = async function(clientId, userId) {
  let modal = document.getElementById('userModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'userModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1250;
      background:rgba(10,30,12,0.97);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  // Get existing user data
  const userDoc = await getDoc(doc(db, `clients/${clientId}/users/${userId}`));
  if (!userDoc.exists()) return;
  const u = userDoc.data();

  modal.innerHTML = `
    <div style="background:#101b13;border-radius:18px;box-shadow:0 0 30px #36ff719a;padding:36px 36px;min-width:320px;max-width:90vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:17px;">Edit User</h2>
      <form id="editUserForm">
        <label style="color:#36ff71;">Username</label>
        <input id="editUsername" type="text" value="${u.username || ''}" required>
        <label style="color:#36ff71;">First Name</label>
        <input id="editFirstName" type="text" value="${u.first_name || ''}" required>
        <label style="color:#36ff71;">Last Name</label>
        <input id="editLastName" type="text" value="${u.last_name || ''}" required>
        <label style="color:#36ff71;">Role</label>
        <select id="editUserRole" required>
          <option value="user" ${u.role === "user" ? "selected" : ""}>User</option>
          <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
        <label style="color:#36ff71;">Password</label>
        <input id="editPassword" type="password" value="${u.password || ''}" required>
        <button type="submit" class="manage-btn" style="width:100%;margin-top:12px;">Save</button>
        <div id="editUserMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeUserModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('editUserForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('editUserMsg');
    msg.textContent = "Saving...";
    try {
      await updateDoc(doc(db, `clients/${clientId}/users/${userId}`), {
        username: document.getElementById('editUsername').value.trim(),
        first_name: document.getElementById('editFirstName').value.trim(),
        last_name: document.getElementById('editLastName').value.trim(),
        role: document.getElementById('editUserRole').value,
        password: document.getElementById('editPassword').value.trim(),
        updated_at: serverTimestamp()
      });
      msg.textContent = "User updated!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeUserModal();
        renderUsersPanel(clientId);
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};

window.deleteUser = async function(clientId, userId) {
  if (!confirm('Delete this user?')) return;
  try {
    await updateDoc(doc(db, `clients/${clientId}/users/${userId}`), { deleted: true });
    await renderUsersPanel(clientId);
  } catch (err) {
    alert("Error deleting user: " + (err.message || "Unknown error"));
  }
};

window.editAsset = async function(clientId, assetId) {
  let modal = document.getElementById('assetModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assetModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1260;
      background:rgba(10,30,12,0.97);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  // Get existing asset data
  const assetDoc = await getDoc(doc(db, `clients/${clientId}/assets/${assetId}`));
  if (!assetDoc.exists()) return;
  const a = assetDoc.data();
  const templateDropdown = await renderAssetTemplateDropdown(a.questionTemplateId);

  modal.innerHTML = `
    <div style="background:#101b13;border-radius:18px;box-shadow:0 0 30px #36ff719a;padding:36px 36px;min-width:320px;max-width:90vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:17px;">Edit Asset</h2>
      <form id="editAssetForm">
        <label style="color:#36ff71;">Name</label>
        <input id="editAssetName" type="text" value="${a.name || ''}" required>
        <label style="color:#36ff71;">Type</label>
        <input id="editAssetType" type="text" value="${a.type || ''}" required>
        <label style="color:#36ff71;">Location</label>
        <input id="editAssetLocation" type="text" value="${a.location || ''}">
        <label style="color:#36ff71;">Status</label>
        <input id="editAssetStatus" type="text" value="${a.status || ''}">
        ${templateDropdown}
        <button type="submit" class="manage-btn" style="width:100%;margin-top:12px;">Save</button>
        <div id="editAssetMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeAssetModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('editAssetForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('editAssetMsg');
    msg.textContent = "Saving...";
    try {
      await updateDoc(doc(db, `clients/${clientId}/assets/${assetId}`), {
        name: document.getElementById('editAssetName').value.trim(),
        type: document.getElementById('editAssetType').value.trim(),
        location: document.getElementById('editAssetLocation').value.trim(),
        status: document.getElementById('editAssetStatus').value.trim(),
        questionTemplateId: document.getElementById('assetTemplateSelect').value,
        updated_at: serverTimestamp()
      });
      msg.textContent = "Asset updated!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeAssetModal();
        renderAssetsPanel(clientId);
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};

window.deleteAsset = async function(clientId, assetId) {
  if (!confirm('Delete this asset?')) return;
  try {
    await updateDoc(doc(db, `clients/${clientId}/assets/${assetId}`), { deleted: true });
    await renderAssetsPanel(clientId);
  } catch (err) {
    alert("Error deleting asset: " + (err.message || "Unknown error"));
  }
};

// ====== UTILITY: Calculate next inspection date based on frequency string ======
function calculateNextInspectionDate(frequency) {
  if (!frequency) return null;
  const now = new Date();
  const freq = frequency.trim().toLowerCase();
  let nextDate = new Date(now);

  switch(freq) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semiannual':
    case 'semi-annually':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'annual':
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // If unrecognized frequency, return null (no auto update)
      return null;
  }
  return nextDate;
}

// ====== Function: Update Asset's nextInspectionDate after inspection completion ======
export async function updateAssetNextInspection(clientId, assetId) {
  try {
    // Get asset doc
    const assetRef = doc(db, `clients/${clientId}/assets/${assetId}`);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) return;

    const assetData = assetSnap.data();
    if (!assetData.questionTemplateId) return;

    // Get template to get frequency
    const templateRef = doc(db, "questionTemplates", assetData.questionTemplateId);
    const templateSnap = await getDoc(templateRef);
    if (!templateSnap.exists()) return;

    const frequency = templateSnap.data().frequency;
    const nextDate = calculateNextInspectionDate(frequency);
    if (!nextDate) return;

    // Update asset with new nextInspectionDate (Firestore Timestamp)
    await updateDoc(assetRef, {
      nextInspectionDate: nextDate ? new Date(nextDate) : null,
      updated_at: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating nextInspectionDate:", error);
  }
}

// ====== Function: Call this after adding a completed inspection log ======
export async function addInspectionLogAndUpdateNext(clientId, assetId, logData) {
  try {
    // Add inspection log under asset logs subcollection
    const logsCol = collection(db, `clients/${clientId}/assets/${assetId}/logs`);
    await addDoc(logsCol, {
      ...logData,
      date: serverTimestamp(),
      created_at: serverTimestamp()
    });

    // If status is complete, update nextInspectionDate on asset
    if (logData.status && logData.status.toLowerCase() === 'complete') {
      await updateAssetNextInspection(clientId, assetId);
    }
  } catch (error) {
    console.error("Error adding inspection log and updating next date:", error);
  }
}
