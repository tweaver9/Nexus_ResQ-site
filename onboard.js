// onboard.js
import { db, storage } from './firebase.js';
import {
  collection, addDoc, setDoc, doc, getDocs, updateDoc, serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Use Firestore as: db.collection(...), db.doc(...), etc.

// === SECURITY: Restrict page to Nexus Owners only ===
if (sessionStorage.role !== 'nexus_owner') {
  document.body.innerHTML = '<div style="color:#fdd835;font-size:1.2em;margin:64px auto;max-width:380px;text-align:center;">Access Denied<br>This page is restricted to Nexus Owners.</div>';
  throw new Error("Not authorized");
}

// ========== LEFT: Add Client ==========

// Form elements
const clientForm = document.getElementById('addClientForm');
const clientNameInput = document.getElementById('clientName');
const clientLogoInput = document.getElementById('clientLogo');
const adminFirstInput = document.getElementById('adminFirstName');
const adminLastInput = document.getElementById('adminLastName');
const adminUsernameInput = document.getElementById('adminUsername');
const adminPasswordInput = document.getElementById('adminPassword');
const clientFormMsg = document.getElementById('clientFormMsg');
const onboardCreds = document.getElementById('onboardCreds');

let newClientId = null; // Firestore doc ID

// Username/password generator
function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 16);
}
function makeUsername(first, last, client) {
  return (first[0] || '').toLowerCase() + slug(last) + '.' + slug(client);
}
function makePassword(client) {
  // Example: Acme2024!
  const year = new Date().getFullYear();
  return slug(client).slice(0, 4) + year + '!';
}

// Auto-fill admin username and default password as you type
function autoFillAdmin() {
  const f = adminFirstInput.value.trim();
  const l = adminLastInput.value.trim();
  const c = clientNameInput.value.trim();
  adminUsernameInput.value = (f && l && c) ? makeUsername(f, l, c) : '';
  adminPasswordInput.value = c ? makePassword(c) : '';
}
clientNameInput.oninput = adminFirstInput.oninput = adminLastInput.oninput = autoFillAdmin;

// --- Handle Add Client Form Submit ---
clientForm.onsubmit = async function (e) {
  e.preventDefault();
  clientFormMsg.style.color = "#fdd835";
  clientFormMsg.textContent = "Creating client...";
  onboardCreds.style.display = "none";
  clientForm.querySelector("#submitClientBtn").disabled = true;

  const clientName = clientNameInput.value.trim();
  const logoFile = clientLogoInput.files[0];
  const adminFirst = adminFirstInput.value.trim();
  const adminLast = adminLastInput.value.trim();
  const adminUsername = adminUsernameInput.value.trim();
  const adminPassword = adminPasswordInput.value.trim();

  // Validation
  if (!clientName || !logoFile || !adminFirst || !adminLast || !adminUsername || !adminPassword) {
    clientFormMsg.style.color = "#ff5050";
    clientFormMsg.textContent = "Please fill out all fields and upload a logo.";
    clientForm.querySelector("#submitClientBtn").disabled = false;
    return;
  }

  try {
    // 1. Create client doc in Firestore (get ID first)
    const clientRef = await addDoc(collection(db, "clients"), {
      name: clientName,
      created_at: serverTimestamp()
    });
    newClientId = clientRef.id;

    // 2. Process and upload logo (to /clients/{id}/logo.webp)
    const logoUrl = await uploadLogoAndGetUrl(logoFile, newClientId);

    // 3. Update client doc with logo
    await updateDoc(doc(db, "clients", newClientId), { logo_url: logoUrl });

    // 4. Create admin user in subcollection with username/pass (force mustChangePassword: true)
    await addDoc(collection(db, `clients/${newClientId}/users`), {
      username: adminUsername,
      password: adminPassword, // Later: hash in production
      first_name: adminFirst,
      last_name: adminLast,
      role: "admin",
      mustChangePassword: true,
      created_at: serverTimestamp()
    });

    // 5. Show credentials, refresh right-side client dropdown
    onboardCreds.innerHTML = `
      <b>Client successfully created!</b><br><br>
      <b>Client Name:</b> ${clientName}<br>
      <b>Client ID:</b> ${newClientId}<br>
      <b>Admin Username:</b> <code>${adminUsername}</code><br>
      <b>Default Password:</b> <code>${adminPassword}</code><br>
      <b>Logo URL:</b> <a href="${logoUrl}" target="_blank" style="color:#fdd835;">View Logo</a>
    `;
    onboardCreds.style.display = "block";
    clientFormMsg.textContent = "";
    await refreshClientDropdown(newClientId); // Right-side select auto-selects this client
    clientForm.reset();
    autoFillAdmin();
  } catch (err) {
    clientFormMsg.style.color = "#ff5050";
    clientFormMsg.textContent = "Error: " + (err.message || "Unknown error");
  }
  clientForm.querySelector("#submitClientBtn").disabled = false;
};

// --- LOGO HANDLING: Convert to webp, resize, upload to storage, return URL ---
async function uploadLogoAndGetUrl(file, clientId) {
  // Convert to webp and resize using browser
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

// ========== RIGHT: Onboarding Tools ==========

const clientSelect = document.getElementById('onboardClientSelect');
const addLocationBtn = document.getElementById('addLocationBtn');
const addAssetTypeBtn = document.getElementById('addAssetTypeBtn');
const addRoleBtn = document.getElementById('addRoleBtn');
const addAssetBtn = document.getElementById('addAssetBtn');
const moveAssetBtn = document.getElementById('moveAssetBtn');
const onboardFormsContainer = document.getElementById('onboardFormsContainer');

// Populate client dropdown on load, and after adding a client
async function refreshClientDropdown(selectId = null) {
  clientSelect.innerHTML = '<option value="">(Select or create client...)</option>';
  const snap = await getDocs(collection(db, "clients"));
  snap.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;
    clientSelect.innerHTML += `<option value="${id}" ${id === selectId ? 'selected' : ''}>${c.name || id}</option>`;
  });
  // Enable buttons if a client is selected
  updateOnboardToolButtons();
}
refreshClientDropdown();

// Update enabled/disabled state of tool buttons
clientSelect.onchange = updateOnboardToolButtons;
function updateOnboardToolButtons() {
  const hasClient = !!clientSelect.value;
  addLocationBtn.disabled = !hasClient;
  addAssetTypeBtn.disabled = !hasClient;
  addRoleBtn.disabled = !hasClient;
  addAssetBtn.disabled = !hasClient;
  moveAssetBtn.disabled = !hasClient;
  onboardFormsContainer.innerHTML = "";
}

// Utility: get currently selected clientId
function currentClientId() {
  return clientSelect.value;
}

// ========== ONBOARDING TOOL BUTTONS ==========

// Each opens a modal/form inside onboardFormsContainer. 
addLocationBtn.onclick = () => openAddLocationForm(currentClientId());
addAssetTypeBtn.onclick = () => openAddAssetTypeForm(currentClientId());
addRoleBtn.onclick = () => openAddRoleForm(currentClientId());
addAssetBtn.onclick = () => openAddAssetForm(currentClientId());
moveAssetBtn.onclick = () => openMoveAssetForm(currentClientId());

// ===== Example: Add Location/Zone/Area =====
function openAddLocationForm(clientId) {
  if (!clientId) return;
  onboardFormsContainer.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:400px;">
      <h3 style="color:#fdd835;">Add Location/Zone/Area</h3>
      <form id="locationForm">
        <label>Type</label>
        <select id="locationType">
          <option value="Location">Location</option>
          <option value="Zone">Zone</option>
          <option value="Area">Area</option>
          <option value="Custom">Custom</option>
        </select>
        <input type="text" id="customLabel" style="display:none;margin-top:6px;" placeholder="Enter custom label">
        <label>Name</label>
        <input type="text" id="locationName" required placeholder="e.g. Warehouse 1">
        <label style="font-size:0.99em;display:inline-flex;align-items:center;margin-bottom:7px;">
          <input type="checkbox" id="keepSelections_location" style="margin-right:7px;">
          Keep selections after submit
        </label>
        <button class="onboard-btn" type="submit" id="locationSubmitBtn">Add</button>
        <span id="locationFormMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  const locationType = document.getElementById('locationType');
  const customLabel = document.getElementById('customLabel');
  locationType.onchange = () => {
    customLabel.style.display = locationType.value === 'Custom' ? '' : 'none';
  };
  document.getElementById('locationForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('locationFormMsg');
    msg.textContent = "Adding...";
    const type = locationType.value;
    const label = type === "Custom" ? customLabel.value.trim() : type;
    const name = document.getElementById('locationName').value.trim();
    if (!label || !name) {
      msg.style.color = "#ff5050";
      msg.textContent = "Fill out all fields.";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${clientId}/locations`), {
        type: label,
        name,
        created_at: serverTimestamp()
      });
      msg.style.color = "#28e640";
      msg.textContent = "Added!";
      // Handle keep selections
      if (document.getElementById('keepSelections_location').checked) {
        document.getElementById('locationName').value = '';
        if (type === 'Custom') customLabel.value = '';
      } else {
        this.reset();
        customLabel.style.display = 'none';
      }
    } catch (error) {
      msg.style.color = "#ff5050";
      msg.textContent = "Error: " + (error.message || "Unknown error");
    }
  };
}

// ======= Add Asset Type =======
function openAddAssetTypeForm(clientId) {
  if (!clientId) return;
  onboardFormsContainer.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:400px;">
      <h3 style="color:#fdd835;">Add Asset Type</h3>
      <form id="assetTypeForm">
        <label>Name</label>
        <input type="text" id="typeName" required placeholder="e.g. Fire Extinguisher">
        <label style="font-size:0.99em;display:inline-flex;align-items:center;margin-bottom:7px;">
          <input type="checkbox" id="keepSelections_type" style="margin-right:7px;">
          Keep selections after submit
        </label>
        <button class="onboard-btn" type="submit" id="assetTypeSubmitBtn">Add</button>
        <span id="assetTypeFormMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  document.getElementById('assetTypeForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('assetTypeFormMsg');
    msg.textContent = "Adding...";
    const name = document.getElementById('typeName').value.trim();
    if (!name) {
      msg.style.color = "#ff5050";
      msg.textContent = "Enter a name.";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${clientId}/assetTypes`), { name, created_at: serverTimestamp() });
      msg.style.color = "#28e640";
      msg.textContent = "Added!";
      if (document.getElementById('keepSelections_type').checked) {
        document.getElementById('typeName').value = '';
      } else {
        this.reset();
      }
    } catch (error) {
      msg.style.color = "#ff5050";
      msg.textContent = "Error: " + (error.message || "Unknown error");
    }
  };
}

// ======= Add Role =======
function openAddRoleForm(clientId) {
  if (!clientId) return;
  onboardFormsContainer.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:440px;">
      <h3 style="color:#fdd835;">Add Role</h3>
      <form id="roleForm">
        <label>Role Name</label>
        <input type="text" id="roleName" required placeholder="e.g. Shift Leader">
        <label>Permissions</label>
        <div>
          <label><input type="checkbox" value="manage_users"> Manage Users</label>
          <label><input type="checkbox" value="view_reports"> View Reports</label>
          <label><input type="checkbox" value="assign_manager"> Assign Manager</label>
        </div>
        <label>Reports To</label>
        <input type="text" id="reportsTo" placeholder="Optional (role name)">
        <label style="font-size:0.99em;display:inline-flex;align-items:center;margin-bottom:7px;">
          <input type="checkbox" id="keepSelections_role" style="margin-right:7px;">
          Keep selections after submit
        </label>
        <button class="onboard-btn" type="submit" id="roleSubmitBtn">Add</button>
        <span id="roleFormMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  document.getElementById('roleForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('roleFormMsg');
    msg.textContent = "Adding...";
    const name = document.getElementById('roleName').value.trim();
    const permissions = Array.from(this.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const reportsTo = document.getElementById('reportsTo').value.trim();
    if (!name) {
      msg.style.color = "#ff5050";
      msg.textContent = "Enter a role name.";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${clientId}/roles`), {
        name, permissions, reports_to: reportsTo, created_at: serverTimestamp()
      });
      msg.style.color = "#28e640";
      msg.textContent = "Added!";
      if (document.getElementById('keepSelections_role').checked) {
        document.getElementById('roleName').value = '';
        document.getElementById('reportsTo').value = '';
        this.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
      } else {
        this.reset();
      }
    } catch (error) {
      msg.style.color = "#ff5050";
      msg.textContent = "Error: " + (error.message || "Unknown error");
    }
  };
}

// ======= Add Asset =======
function openAddAssetForm(clientId) {
  if (!clientId) return;
  onboardFormsContainer.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:480px;">
      <h3 style="color:#fdd835;">Add Asset</h3>
      <form id="assetForm">
        <label>Asset ID</label>
        <input type="text" id="assetId" required placeholder="e.g. Extinguisher001">
        <label>Type</label>
        <input type="text" id="assetType" required placeholder="e.g. Extinguisher">
        <label>Location</label>
        <input type="text" id="assetLocation" required placeholder="e.g. Office A">
        <label>Assigned User</label>
        <input type="text" id="assignedUser" placeholder="Optional">
        <label>Status</label>
        <select id="assetStatus">
          <option value="in_service">In Service</option>
          <option value="out_of_service">Out of Service</option>
          <option value="moved">Moved</option>
        </select>
        <label style="font-size:0.99em;display:inline-flex;align-items:center;margin-bottom:7px;">
          <input type="checkbox" id="keepSelections_asset" style="margin-right:7px;">
          Keep selections after submit
        </label>
        <button class="onboard-btn" type="submit" id="assetSubmitBtn">Add</button>
        <span id="assetFormMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  document.getElementById('assetForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('assetFormMsg');
    msg.textContent = "Adding...";
    const asset_id = document.getElementById('assetId').value.trim();
    const type = document.getElementById('assetType').value.trim();
    const location = document.getElementById('assetLocation').value.trim();
    const assigned_user = document.getElementById('assignedUser').value.trim();
    const status = document.getElementById('assetStatus').value;
    if (!asset_id || !type || !location) {
      msg.style.color = "#ff5050";
      msg.textContent = "Fill all required fields.";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${clientId}/assets`), {
        asset_id, type, location, assigned_user, status, created_at: serverTimestamp()
      });
      msg.style.color = "#28e640";
      msg.textContent = "Added!";
      if (document.getElementById('keepSelections_asset').checked) {
        document.getElementById('assetId').value = '';
        document.getElementById('assignedUser').value = '';
      } else {
        this.reset();
      }
    } catch (error) {
      msg.style.color = "#ff5050";
      msg.textContent = "Error: " + (error.message || "Unknown error");
    }
  };
}

// ======= Move Asset =======
function openMoveAssetForm(clientId) {
  if (!clientId) return;
  // Fetch all assets
  getDocs(collection(db, `clients/${clientId}/assets`)).then(snapshot => {
    const assets = [];
    snapshot.forEach(doc => assets.push({ id: doc.id, ...doc.data() }));
    onboardFormsContainer.innerHTML = `
      <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:480px;">
        <h3 style="color:#fdd835;">Move Asset</h3>
        <form id="moveAssetForm">
          <label>Select Asset</label>
          <select id="moveAssetSelect" required>
            <option value="">-- Select Asset --</option>
            ${assets.map(a => `<option value="${a.id}">${a.asset_id || a.id} (${a.location || "-"})</option>`).join('')}
          </select>
          <label>New Location</label>
          <input type="text" id="newAssetLocation" required placeholder="e.g. Office B">
          <button class="onboard-btn" type="submit" id="moveAssetSubmitBtn">Move</button>
          <span id="moveAssetFormMsg" style="margin-left:10px;color:#fdd835;"></span>
        </form>
      </div>
    `;
    document.getElementById('moveAssetForm').onsubmit = async function (e) {
      e.preventDefault();
      const msg = document.getElementById('moveAssetFormMsg');
      msg.textContent = "Moving...";
      const assetId = document.getElementById('moveAssetSelect').value;
      const newLocation = document.getElementById('newAssetLocation').value.trim();
      if (!assetId || !newLocation) {
        msg.style.color = "#ff5050";
        msg.textContent = "Select asset and enter new location.";
        return;
      }
      try {
        await updateDoc(doc(db, `clients/${clientId}/assets/${assetId}`), {
          location: newLocation,
          status: "moved"
        });
        msg.style.color = "#28e640";
        msg.textContent = "Moved!";
      } catch (error) {
        msg.style.color = "#ff5050";
        msg.textContent = "Error: " + (error.message || "Unknown error");
      }
    };
  });
}
