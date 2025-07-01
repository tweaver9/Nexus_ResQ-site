import { db, storage } from './firebase.js';
import {
  collection, addDoc, setDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ========== SECURITY: Nexus Owner Only ==========
if (sessionStorage.role !== 'nexus') {
  document.body.innerHTML = '<div style="color:#fdd835;font-size:1.2em;margin:64px auto;max-width:380px;text-align:center;">Access Denied<br>This page is restricted to Nexus Owners.</div>';
  throw new Error("Not authorized");
}

// ========== CLIENT CREATION ==========
const clientForm = document.getElementById('addClientForm');
const clientNameInput = document.getElementById('clientName');
const clientLogoInput = document.getElementById('clientLogo');
const adminFirstInput = document.getElementById('adminFirstName');
const adminLastInput = document.getElementById('adminLastName');
const adminUsernameInput = document.getElementById('adminUsername');
const adminPasswordInput = document.getElementById('adminPassword');
const clientFormMsg = document.getElementById('clientFormMsg');
const onboardCreds = document.getElementById('onboardCreds');

function slug(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}
function makeUsername(first, last, client) {
  return (first[0] || '').toLowerCase() + slug(last) + '.' + slug(client);
}
function makePassword(client) {
  const year = new Date().getFullYear();
  return slug(client).slice(0, 4) + year + '!';
}
function autoFillAdmin() {
  const f = adminFirstInput.value.trim();
  const l = adminLastInput.value.trim();
  const c = clientNameInput.value.trim();
  adminUsernameInput.value = (f && l && c) ? makeUsername(f, l, c) : '';
  adminPasswordInput.value = c ? makePassword(c) : '';
}
clientNameInput.oninput = adminFirstInput.oninput = adminLastInput.oninput = autoFillAdmin;

clientForm.onsubmit = async function (e) {
  e.preventDefault();
  clientFormMsg.style.color = "#fdd835";
  clientFormMsg.textContent = "Creating client...";
  onboardCreds.style.display = "none";
  clientForm.querySelector("#submitClientBtn").disabled = true;

  const clientName = clientNameInput.value.trim();
  const clientSubdomain = slug(clientName);
  const logoFile = clientLogoInput.files[0];
  const adminFirst = adminFirstInput.value.trim();
  const adminLast = adminLastInput.value.trim();
  const adminUsername = adminUsernameInput.value.trim();
  const adminPassword = adminPasswordInput.value.trim();

  if (!clientName || !logoFile || !adminFirst || !adminLast || !adminUsername || !adminPassword) {
    clientFormMsg.style.color = "#ff5050";
    clientFormMsg.textContent = "Please fill out all fields and upload a logo.";
    clientForm.querySelector("#submitClientBtn").disabled = false;
    return;
  }

  try {
    // 1. Add client doc (with auto subdomain)
    let clientRef;
    try {
      clientRef = await addDoc(collection(db, "clients"), {
        name: clientName,
        subdomain: clientSubdomain,
        created_at: serverTimestamp()
      });
    } catch (err) {
      throw new Error("Failed to create client doc: " + err.message);
    }
    const clientId = clientRef.id;

    // 2. Upload logo
    let logoUrl;
    try {
      logoUrl = await uploadLogoAndGetUrl(logoFile, clientId);
    } catch (err) {
      throw new Error("Failed to upload logo: " + err.message);
    }

    // 3. Update client with logo URL
    try {
      await updateDoc(doc(db, "clients", clientId), { logo_url: logoUrl });
    } catch (err) {
      throw new Error("Failed to update client with logo URL: " + err.message);
    }

    // 4. Add admin user
    try {
      await addDoc(collection(db, `clients/${clientId}/users`), {
        username: adminUsername,
        password: adminPassword,
        first_name: adminFirst,
        last_name: adminLast,
        role: "admin",
        mustChangePassword: true,
        created_at: serverTimestamp()
      });
    } catch (err) {
      throw new Error("Failed to add admin user: " + err.message);
    }

    // 5. Success!
    onboardCreds.innerHTML = `<b>Client successfully created!</b><br><br>
      <b>Client Name:</b> ${clientName}<br>
      <b>Subdomain:</b> ${clientSubdomain}<br>
      <b>Client ID:</b> ${clientId}<br>
      <b>Admin Username:</b> <code>${adminUsername}</code><br>
      <b>Default Password:</b> <code>${adminPassword}</code><br>
      <b>Logo URL:</b> <a href="${logoUrl}" target="_blank" style="color:#fdd835;">View Logo</a>
    `;
    onboardCreds.style.display = "block";
    clientFormMsg.textContent = "";
    clientForm.reset();
    autoFillAdmin();
  } catch (err) {
    clientFormMsg.style.color = "#ff5050";
    clientFormMsg.textContent = "Error: " + (err.message || "Unknown error");
    console.error('Client creation failed:', err);
  }
  clientForm.querySelector("#submitClientBtn").disabled = false;
};

async function uploadLogoAndGetUrl(file, clientId) {
  const img = await fileToImage(file);
  const webpBlob = await imageToWebp(img, 220, 120);
  const storageRef = ref(storage, `clients/${clientId}/logo.webp`);
  await uploadBytes(storageRef, webpBlob, { contentType: "image/webp" });
  return await getDownloadURL(storageRef);
}
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target.result; };
    img.onload = () => resolve(img);
    img.onerror = reject;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function imageToWebp(img, maxW = 220, maxH = 120) {
  const canvas = document.createElement('canvas');
  let [w, h] = [img.width, img.height];
  const ratio = Math.min(maxW / w, maxH / h, 1);
  w = Math.round(w * ratio);
  h = Math.round(h * ratio);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise(resolve =>
    canvas.toBlob(blob => resolve(blob), 'image/webp', 0.92)
  );
}

// ========== MANAGE CLIENTS MODAL WITH TABS ==========

// ---- Modal HTML inject (add this to onboard.html body!) ----
function injectClientManagerModal() {
  if (!document.getElementById('clientManagerModal')) {
    const modal = document.createElement('div');
    modal.id = 'clientManagerModal';
    modal.style = `
      display:none;position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:9999;
      background:rgba(0,0,0,0.85);align-items:center;justify-content:center;
      overflow-y:auto;`;
    modal.innerHTML = `
      <div id="clientManagerModalContent" style="background:#13291a;border-radius:15px;box-shadow:0 0 32px #36ff719a;padding:34px 38px;min-width:340px;max-width:95vw;">
      </div>
    `;
    document.body.appendChild(modal);
  }
}
injectClientManagerModal();

// -- Button logic: place this on your page for Nexus Owners
if (document.getElementById('manageClientsBtn')) {
  document.getElementById('manageClientsBtn').onclick = function () {
    document.getElementById('clientManagerModal').style.display = 'flex';
    renderClientManager();
  };
}

// -- ESC & click-outside closes modal --
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

// ======= CLIENT MANAGER TABS LOGIC =======
async function populateClientDropdown() {
  const select = document.getElementById('cmClientSelect');
  select.innerHTML = `<option value="all">All</option>`;
  const snap = await getDocs(collection(db, "clients"));
  snap.forEach(docSnap => {
    const c = docSnap.data();
    select.innerHTML += `<option value="${docSnap.id}">${c.name || docSnap.id}</option>`;
  });
}

// -------- Tabs Render ---------
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
      <button class="cm-tab-btn neon-tab" id="tab-users"   style="border-bottom:3px solid #36ff71;">Users</button>
      <button class="cm-tab-btn neon-tab" id="tab-assets">Assets</button>
      <button class="cm-tab-btn neon-tab" id="tab-locations">Locations</button>
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
  // Default: Users tab
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
  document.getElementById('cmClientSelect').onchange = async function() {
    // Rerender active tab for the new client
    const tab = document.querySelector('.cm-tab-btn[style*="border-bottom"]').id.replace('tab-','');
    await renderClientTabPanel(tab, this.value);
  };

  function setTabActive(tab) {
    document.getElementById('tab-users').style.borderBottom = "";
    document.getElementById('tab-assets').style.borderBottom = "";
    document.getElementById('tab-locations').style.borderBottom = "";
    document.getElementById('tab-'+tab).style.borderBottom = "3px solid #36ff71";
  }
}

// ---- Each Tab's Renderer (Users tab is full, others can be expanded as you wish) ----
async function renderClientTabPanel(tab, clientId) {
  if (tab === "users")     await renderUsersPanel(clientId);
  if (tab === "assets")    await renderAssetsPanel(clientId);
  if (tab === "locations") await renderLocationsPanel(clientId);
}

async function renderUsersPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  panel.innerHTML = `<div style="color:#36ff71;text-align:center;">Loading users...</div>`;
  let html = "";
  if (clientId === "all") {
    const snap = await getDocs(collection(db, "clients"));
    for (const docSnap of snap.docs) {
      const c = docSnap.data();
      const clientUsers = await getDocs(collection(db, `clients/${docSnap.id}/users`));
      if (!clientUsers.size) continue;
      html += `<div style="margin:24px 0 8px 0;font-weight:600;color:#50ff9a;">${c.name || docSnap.id}</div>`;
      html += "<table style='width:100%;margin-bottom:22px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;'><thead><tr>" +
        "<th>Username</th><th>Name</th><th>Role</th><th>Actions</th></tr></thead><tbody>";
      clientUsers.forEach(userSnap => {
        const u = userSnap.data();
        if (u.deleted) return; // Soft delete
        html += `<tr>
          <td>${u.username}</td>
          <td>${u.first_name || ""} ${u.last_name || ""}</td>
          <td>${u.role || ""}</td>
          <td>
            <button onclick="editUser('${docSnap.id}','${userSnap.id}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">Edit</button>
            <button onclick="deleteUser('${docSnap.id}','${userSnap.id}')" style="color:#f00;background:none;border:none;cursor:pointer;">Delete</button>
          </td>
        </tr>`;
      });
      html += "</tbody></table>";
    }
    panel.innerHTML = html || "<div style='color:#36ff71'>No users found.</div>";
  } else {
    const clientSnap = await getDoc(doc(db, "clients", clientId));
    const c = clientSnap.data();
    html += `<div style="margin:12px 0 16px 0;font-weight:600;color:#50ff9a;text-align:center;font-size:1.15em;">
      ${c.name || clientId}</div>`;
    const clientUsers = await getDocs(collection(db, `clients/${clientId}/users`));
    html += `<table style='width:100%;margin-bottom:22px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;'><thead><tr>
      <th>Username</th><th>Name</th><th>Role</th><th>Actions</th></tr></thead><tbody>`;
    clientUsers.forEach(userSnap => {
      const u = userSnap.data();
      if (u.deleted) return;
      html += `<tr>
        <td>${u.username}</td>
        <td>${u.first_name || ""} ${u.last_name || ""}</td>
        <td>${u.role || ""}</td>
        <td>
          <button onclick="editUser('${clientId}','${userSnap.id}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">Edit</button>
          <button onclick="deleteUser('${clientId}','${userSnap.id}')" style="color:#f00;background:none;border:none;cursor:pointer;">Delete</button>
        </td>
      </tr>`;
    });
    html += "</tbody></table>";
    html += `<button class="manage-btn" style="margin-top:7px;" onclick="showAddUserModal('${clientId}')">Add User</button>`;
    panel.innerHTML = html;
  }
}
// ------- USER MODALS: Add/Edit/Delete -------
window.showAddUserModal = function(clientId) {
  let modal = document.getElementById('addUserModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'addUserModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1200;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:320px;max-width:90vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Add User</h2>
      <form id="addUserForm">
        <label style="color:#36ff71;">First Name</label>
        <input id="addFirstName" type="text" required style="width:100%;padding:9px 11px;margin-bottom:9px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <label style="color:#36ff71;">Last Name</label>
        <input id="addLastName" type="text" required style="width:100%;padding:9px 11px;margin-bottom:9px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <label style="color:#36ff71;">Username</label>
        <input id="addUsername" type="text" required style="width:100%;padding:9px 11px;margin-bottom:9px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <label style="color:#36ff71;">Role</label>
        <select id="addRole" required style="width:100%;padding:9px 11px;margin-bottom:13px;background:#181f18;color:#36ff71;border-radius:7px;border:1.5px solid #36ff71;">
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <label style="color:#36ff71;">Temporary Password</label>
        <input id="addPassword" type="text" required style="width:100%;padding:9px 11px;margin-bottom:14px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <button type="submit" class="manage-btn" style="width:100%;margin-top:8px;">Add User</button>
        <div id="addUserMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeAddUserModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('addUserForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('addUserMsg');
    msg.style.color = "#fdd835";
    msg.textContent = "Adding...";
    const first = document.getElementById('addFirstName').value.trim();
    const last = document.getElementById('addLastName').value.trim();
    const username = document.getElementById('addUsername').value.trim();
    const role = document.getElementById('addRole').value;
    const password = document.getElementById('addPassword').value.trim();
    if (!first || !last || !username || !role || !password) {
      msg.textContent = "Fill out all fields.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${clientId}/users`), {
        first_name: first,
        last_name: last,
        username,
        role,
        password,
        mustChangePassword: true,
        created_at: serverTimestamp()
      });
      msg.textContent = "User added!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeAddUserModal();
        renderUsersPanel(clientId);
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeAddUserModal = function() {
  let modal = document.getElementById('addUserModal');
  if (modal) modal.style.display = "none";
};
// Clean up on real close (optional)
document.addEventListener('keydown', e => {
  if (e.key === "Escape") window.closeAddUserModal();
});
document.body.addEventListener('mousedown', e => {
  const modal = document.getElementById('addUserModal');
  if (modal && e.target === modal) window.closeAddUserModal();
});

window.editUser = async function(clientId, userId) {
  const userDoc = await getDoc(doc(db, `clients/${clientId}/users/${userId}`));
  if (!userDoc.exists() || userDoc.data().deleted) {
    alert("User not found.");
    return;
  }
  const user = userDoc.data();
  let modal = document.getElementById('editUserModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'editUserModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1200;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:320px;max-width:90vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Edit User</h2>
      <form id="editUserForm">
        <label style="color:#36ff71;">First Name</label>
        <input id="editFirstName" type="text" required style="width:100%;padding:9px 11px;margin-bottom:9px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${user.first_name || ""}">
        <label style="color:#36ff71;">Last Name</label>
        <input id="editLastName" type="text" required style="width:100%;padding:9px 11px;margin-bottom:9px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${user.last_name || ""}">
        <label style="color:#36ff71;">Username</label>
        <input id="editUsername" type="text" required style="width:100%;padding:9px 11px;margin-bottom:9px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${user.username || ""}">
        <label style="color:#36ff71;">Role</label>
        <select id="editRole" required style="width:100%;padding:9px 11px;margin-bottom:13px;background:#181f18;color:#36ff71;border-radius:7px;border:1.5px solid #36ff71;">
          <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
          <option value="manager" ${user.role === "manager" ? "selected" : ""}>Manager</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
        <label style="color:#36ff71;">Temporary Password</label>
        <input id="editPassword" type="text" required style="width:100%;padding:9px 11px;margin-bottom:14px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${user.password || ""}">
        <button type="submit" class="manage-btn" style="width:100%;margin-top:8px;">Update User</button>
        <div id="editUserMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeEditUserModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('editUserForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('editUserMsg');
    msg.style.color = "#fdd835";
    msg.textContent = "Updating...";
    const first = document.getElementById('editFirstName').value.trim();
    const last = document.getElementById('editLastName').value.trim();
    const username = document.getElementById('editUsername').value.trim();
    const role = document.getElementById('editRole').value;
    const password = document.getElementById('editPassword').value.trim();
    if (!first || !last || !username || !role || !password) {
      msg.textContent = "Fill out all fields.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await updateDoc(doc(db, `clients/${clientId}/users/${userId}`), {
        first_name: first,
        last_name: last,
        username,
        role,
        password,
        mustChangePassword: true,
        updated_at: serverTimestamp()
      });
      msg.textContent = "User updated!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeEditUserModal();
        renderUsersPanel(clientId);
      }, 900);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeEditUserModal = function() {
  let modal = document.getElementById('editUserModal');
  if (modal) modal.style.display = "none";
};
window.deleteUser = async function(clientId, userId) {
  if (!confirm("Delete this user? This cannot be undone.")) return;
  await updateDoc(doc(db, `clients/${clientId}/users/${userId}`), { deleted: true });
  await renderUsersPanel(clientId);
};

async function renderAssetsPanel(clientId) {
  const panel = document.getElementById('cmTabPanel');
  panel.innerHTML = `<div style="color:#36ff71;text-align:center;">Loading assets...</div>`;
  let html = "";

  // Helper for table row actions
  function assetActions(cid, aid) {
    return `
      <button onclick="editAsset('${cid}','${aid}')" style="color:#36ff71;background:none;border:none;cursor:pointer;">Edit</button>
      <button onclick="deleteAsset('${cid}','${aid}')" style="color:#f00;background:none;border:none;cursor:pointer;">Delete</button>
    `;
  }

  if (clientId === "all") {
    const snap = await getDocs(collection(db, "clients"));
    for (const docSnap of snap.docs) {
      const c = docSnap.data();
      const assets = await getDocs(collection(db, `clients/${docSnap.id}/assets`));
      if (!assets.size) continue;
      html += `<div style="margin:24px 0 8px 0;font-weight:600;color:#50ff9a;">${c.name || docSnap.id}</div>`;
      html += `<table style='width:100%;margin-bottom:22px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;'>
        <thead>
          <tr>
            <th>Asset ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Location</th>
            <th>Assigned User</th>
            <th>Status</th>
            <th>Last Inspected By</th>
            <th>Last Inspection</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>`;
      assets.forEach(assetSnap => {
        const a = assetSnap.data();
        if (a.deleted) return;
        html += `<tr>
          <td>${assetSnap.id}</td>
          <td>${a.name || ""}</td>
          <td>${a.type || ""}</td>
          <td>${a.location || ""}</td>
          <td>${a.assigned_user || ""}</td>
          <td>${a.status || ""}</td>
          <td>${a.last_inspected_by || ""}</td>
          <td>${a.last_inspection ? (a.last_inspection.toDate ? a.last_inspection.toDate().toLocaleDateString() : a.last_inspection) : ""}</td>
          <td>${assetActions(docSnap.id, assetSnap.id)}</td>
        </tr>`;
      });
      html += "</tbody></table>";
    }
    // Bulk add/delete coming below
    panel.innerHTML = html || "<div style='color:#36ff71'>No assets found.</div>";
  } else {
    // Single client
    const assets = await getDocs(collection(db, `clients/${clientId}/assets`));
    html += `
      <button class="manage-btn" style="margin-bottom:16px;" onclick="showBulkAddAssetsModal('${clientId}')">Bulk Add Assets</button>
      <button class="manage-btn" style="margin-bottom:16px;" onclick="showBulkDeleteAssetsModal('${clientId}')">Bulk Delete Selected</button>
      <table style='width:100%;margin-bottom:22px;color:#fff;background:#101914;border-radius:7px;box-shadow:0 0 10px #33ff8092;'>
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAllAssets" /></th>
            <th>Asset ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Location</th>
            <th>Assigned User</th>
            <th>Status</th>
            <th>Last Inspected By</th>
            <th>Last Inspection</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>`;
    assets.forEach(assetSnap => {
      const a = assetSnap.data();
      if (a.deleted) return;
      html += `<tr>
        <td><input type="checkbox" class="assetCheckbox" value="${assetSnap.id}"></td>
        <td>${assetSnap.id}</td>
        <td>${a.name || ""}</td>
        <td>${a.type || ""}</td>
        <td>${a.location || ""}</td>
        <td>${a.assigned_user || ""}</td>
        <td>${a.status || ""}</td>
        <td>${a.last_inspected_by || ""}</td>
        <td>${a.last_inspection ? (a.last_inspection.toDate ? a.last_inspection.toDate().toLocaleDateString() : a.last_inspection) : ""}</td>
        <td>${assetActions(clientId, assetSnap.id)}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    panel.innerHTML = html;
    // Select all logic
    setTimeout(() => {
      const selectAll = document.getElementById('selectAllAssets');
      if (selectAll) {
        selectAll.onclick = () => {
          document.querySelectorAll('.assetCheckbox').forEach(cb => cb.checked = selectAll.checked);
        };
      }
    }, 50);
  }
}
window.renderAssetsPanel = renderAssetsPanel; // so you can call after CRUD

// ============ ASSET ADD/EDIT MODALS =============

// --- Add Asset Modal ---
window.showAddAssetModal = function(clientId) {
  let modal = document.getElementById('addAssetModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'addAssetModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1210;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:350px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Add Asset</h2>
      <form id="addAssetForm">
        <label style="color:#36ff71;">Asset Name</label>
        <input id="addAssetName" type="text" required style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <label style="color:#36ff71;">Type</label>
        <input id="addAssetType" type="text" required style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <label style="color:#36ff71;">Location</label>
        <input id="addAssetLocation" type="text" required style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <label style="color:#36ff71;">Assigned User</label>
        <input id="addAssetAssignedUser" type="text" style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <label style="color:#36ff71;">Status</label>
        <input id="addAssetStatus" type="text" style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <button type="submit" class="manage-btn" style="width:100%;margin-top:8px;">Add Asset</button>
        <div id="addAssetMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeAddAssetModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('addAssetForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('addAssetMsg');
    msg.style.color = "#fdd835";
    msg.textContent = "Adding...";
    const name = document.getElementById('addAssetName').value.trim();
    const type = document.getElementById('addAssetType').value.trim();
    const location = document.getElementById('addAssetLocation').value.trim();
    const assigned_user = document.getElementById('addAssetAssignedUser').value.trim();
    const status = document.getElementById('addAssetStatus').value.trim();
    if (!name || !type || !location) {
      msg.textContent = "Name, Type, and Location are required.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${clientId}/assets`), {
        name, type, location, assigned_user, status,
        created_at: serverTimestamp()
      });
      msg.textContent = "Asset added!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeAddAssetModal();
        renderAssetsPanel(clientId);
      }, 850);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeAddAssetModal = function() {
  let modal = document.getElementById('addAssetModal');
  if (modal) modal.style.display = "none";
};
document.addEventListener('keydown', e => {
  if (e.key === "Escape") window.closeAddAssetModal();
});
document.body.addEventListener('mousedown', e => {
  const modal = document.getElementById('addAssetModal');
  if (modal && e.target === modal) window.closeAddAssetModal();
});

// --- Edit Asset Modal ---
window.editAsset = async function(clientId, assetId) {
  const assetDoc = await getDoc(doc(db, `clients/${clientId}/assets/${assetId}`));
  if (!assetDoc.exists() || assetDoc.data().deleted) {
    alert("Asset not found.");
    return;
  }
  const asset = assetDoc.data();
  let modal = document.getElementById('editAssetModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'editAssetModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1210;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:350px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Edit Asset</h2>
      <form id="editAssetForm">
        <label style="color:#36ff71;">Asset Name</label>
        <input id="editAssetName" type="text" required style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${asset.name||''}">
        <label style="color:#36ff71;">Type</label>
        <input id="editAssetType" type="text" required style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${asset.type||''}">
        <label style="color:#36ff71;">Location</label>
        <input id="editAssetLocation" type="text" required style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${asset.location||''}">
        <label style="color:#36ff71;">Assigned User</label>
        <input id="editAssetAssignedUser" type="text" style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${asset.assigned_user||''}">
        <label style="color:#36ff71;">Status</label>
        <input id="editAssetStatus" type="text" style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${asset.status||''}">
        <button type="submit" class="manage-btn" style="width:100%;margin-top:8px;">Update Asset</button>
        <div id="editAssetMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeEditAssetModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('editAssetForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('editAssetMsg');
    msg.style.color = "#fdd835";
    msg.textContent = "Updating...";
    const name = document.getElementById('editAssetName').value.trim();
    const type = document.getElementById('editAssetType').value.trim();
    const location = document.getElementById('editAssetLocation').value.trim();
    const assigned_user = document.getElementById('editAssetAssignedUser').value.trim();
    const status = document.getElementById('editAssetStatus').value.trim();
    if (!name || !type || !location) {
      msg.textContent = "Name, Type, and Location are required.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await updateDoc(doc(db, `clients/${clientId}/assets/${assetId}`), {
        name, type, location, assigned_user, status,
        updated_at: serverTimestamp()
      });
      msg.textContent = "Asset updated!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeEditAssetModal();
        renderAssetsPanel(clientId);
      }, 850);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeEditAssetModal = function() {
  let modal = document.getElementById('editAssetModal');
  if (modal) modal.style.display = "none";
};
document.addEventListener('keydown', e => {
  if (e.key === "Escape") window.closeEditAssetModal();
});
document.body.addEventListener('mousedown', e => {
  const modal = document.getElementById('editAssetModal');
  if (modal && e.target === modal) window.closeEditAssetModal();
});


// ============ LOCATION ADD/EDIT MODALS =============

// --- Add Location Modal ---
window.showAddLocationModal = function(clientId) {
  let modal = document.getElementById('addLocationModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'addLocationModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1211;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:300px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Add Location</h2>
      <form id="addLocationForm">
        <label style="color:#36ff71;">Location Name</label>
        <input id="addLocationName" type="text" required style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;">
        <button type="submit" class="manage-btn" style="width:100%;margin-top:8px;">Add Location</button>
        <div id="addLocationMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeAddLocationModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('addLocationForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('addLocationMsg');
    msg.style.color = "#fdd835";
    msg.textContent = "Adding...";
    const name = document.getElementById('addLocationName').value.trim();
    if (!name) {
      msg.textContent = "Location name required.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${clientId}/locations`), {
        name,
        created_at: serverTimestamp()
      });
      msg.textContent = "Location added!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeAddLocationModal();
        renderLocationsPanel(clientId);
      }, 800);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeAddLocationModal = function() {
  let modal = document.getElementById('addLocationModal');
  if (modal) modal.style.display = "none";
};
document.addEventListener('keydown', e => {
  if (e.key === "Escape") window.closeAddLocationModal();
});
document.body.addEventListener('mousedown', e => {
  const modal = document.getElementById('addLocationModal');
  if (modal && e.target === modal) window.closeAddLocationModal();
});

// --- Edit Location Modal ---
window.editLocation = async function(clientId, locId) {
  const locDoc = await getDoc(doc(db, `clients/${clientId}/locations/${locId}`));
  if (!locDoc.exists() || locDoc.data().deleted) {
    alert("Location not found.");
    return;
  }
  const location = locDoc.data();
  let modal = document.getElementById('editLocationModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'editLocationModal';
    modal.style = `
      position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:1211;
      background:rgba(10,30,12,0.96);display:flex;align-items:center;justify-content:center;`;
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#101b13;border-radius:20px;box-shadow:0 0 44px #36ff719a;padding:38px 42px;min-width:300px;max-width:92vw;">
      <h2 style="color:#36ff71;text-align:center;margin-bottom:19px;">Edit Location</h2>
      <form id="editLocationForm">
        <label style="color:#36ff71;">Location Name</label>
        <input id="editLocationName" type="text" required style="width:100%;padding:9px 11px;margin-bottom:8px;background:#172719;color:#fff;border-radius:7px;border:1.5px solid #36ff71;" value="${location.name||''}">
        <button type="submit" class="manage-btn" style="width:100%;margin-top:8px;">Update Location</button>
        <div id="editLocationMsg" style="margin-top:13px;text-align:center;"></div>
      </form>
      <button onclick="window.closeEditLocationModal()" class="manage-btn" style="margin:18px auto 0 auto;display:block;width:80%;">Cancel</button>
    </div>
  `;
  modal.style.display = "flex";
  document.getElementById('editLocationForm').onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('editLocationMsg');
    msg.style.color = "#fdd835";
    msg.textContent = "Updating...";
    const name = document.getElementById('editLocationName').value.trim();
    if (!name) {
      msg.textContent = "Location name required.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await updateDoc(doc(db, `clients/${clientId}/locations/${locId}`), {
        name,
        updated_at: serverTimestamp()
      });
      msg.textContent = "Location updated!";
      msg.style.color = "#36ff71";
      setTimeout(() => {
        window.closeEditLocationModal();
        renderLocationsPanel(clientId);
      }, 800);
    } catch (err) {
      msg.textContent = "Error: " + (err.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};
window.closeEditLocationModal = function() {
  let modal = document.getElementById('editLocationModal');
  if (modal) modal.style.display = "none";
};

document.addEventListener('keydown', e => {
  if (e.key === "Escape") window.closeEditLocationModal();
});
document.body.addEventListener('mousedown', e => {
  const modal = document.getElementById('editLocationModal');
  if (modal && e.target === modal) window.closeEditLocationModal();
});


// === Add Asset Button in Single-Client Asset Tab ===
// (Place this near where the asset table renders)
window.renderAssetsPanel = renderAssetsPanel;
window.renderLocationsPanel = renderLocationsPanel;



