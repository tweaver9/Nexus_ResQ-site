// manage-assets.js
import { db } from './firebase.js';
import {
  collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where, orderBy
} from "firebase/firestore";

// ========== STATE ==========
let assetTypes = [];
let locations = [];
let assets = [];
let selectedAssetId = null;

// ========== DOM ==========
const assetsTableBody = document.getElementById('assetsTableBody');
const noAssetsMsg = document.getElementById('noAssetsMsg');
const assetSearch = document.getElementById('assetSearch');
const modalRoot = document.getElementById('modal-root');
const addAssetBtn = document.getElementById('addAssetBtn');
const addTypeBtn = document.getElementById('addTypeBtn');
const addLocationBtn = document.getElementById('addLocationBtn');

// ========== HELPERS ==========
function getTenantId() {
  return sessionStorage.getItem('tenant_id');
}

// ========== LOAD DATA ==========

window.addEventListener('DOMContentLoaded', async () => {
  if (!getTenantId()) {
    window.location.href = 'login.html';
    return;
  }
  await Promise.all([
    loadAssetTypes(),
    loadLocations(),
    loadAssets()
  ]);
  assetSearch.addEventListener('input', renderAssets);
  addAssetBtn.onclick = showAddAssetModal;
  addTypeBtn.onclick = showAddTypeModal;
  addLocationBtn.onclick = showAddLocationModal;
});

// ----- Load Asset Types -----
async function loadAssetTypes() {
  const snap = await getDocs(collection(db, `clients/${getTenantId()}/assetTypes`));
  assetTypes = [];
  snap.forEach(doc => assetTypes.push({ id: doc.id, ...doc.data() }));
}
// ----- Load Locations -----
async function loadLocations() {
  const snap = await getDocs(collection(db, `clients/${getTenantId()}/locations`));
  locations = [];
  snap.forEach(doc => locations.push({ id: doc.id, ...doc.data() }));
}
// ----- Load Assets -----
async function loadAssets() {
  const snap = await getDocs(query(collection(db, `clients/${getTenantId()}/assets`), orderBy('asset_id')));
  assets = [];
  snap.forEach(doc => assets.push({ id: doc.id, ...doc.data() }));
  renderAssets();
}

// ========== RENDER ASSET TABLE ==========
function renderAssets() {
  const searchVal = assetSearch.value.trim().toLowerCase();
  let filtered = assets;
  if (searchVal) {
    filtered = filtered.filter(row =>
      (row.asset_id || '').toLowerCase().includes(searchVal) ||
      (row.type || '').toLowerCase().includes(searchVal) ||
      (row.location || '').toLowerCase().includes(searchVal) ||
      (row.assigned_user || '').toLowerCase().includes(searchVal)
    );
  }
  assetsTableBody.innerHTML = "";
  if (!filtered.length) {
    noAssetsMsg.style.display = "";
    return;
  }
  noAssetsMsg.style.display = "none";

  filtered.forEach(row => {
    assetsTableBody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${statusBadge(row.status)}</td>
        <td>${row.asset_id || "—"}</td>
        <td>${row.type || "—"}</td>
        <td>${row.location || "—"}</td>
        <td>${row.assigned_user || "—"}</td>
        <td>${row.last_inspection || "—"}</td>
        <td>${row.annual_due || "—"}</td>
        <td>${row.maintenance || "—"}</td>
        <td>
          <button class="action-btn" onclick="window.editAsset('${row.id}')">Edit</button>
          <button class="action-btn" onclick="window.deleteAsset('${row.id}')">Delete</button>
        </td>
      </tr>
    `);
  });
}

// ========== STATUS BADGES ==========
function statusBadge(status) {
  if (status === "in_service") return `<span class="status-badge status-inservice">In Service</span>`;
  if (status === "out_of_service") return `<span class="status-badge status-outofservice">Out</span>`;
  if (status === "failed") return `<span class="status-badge status-failed">Failed</span>`;
  if (status === "moved") return `<span class="status-badge status-moved">Moved</span>`;
  return `<span class="status-badge">${status || "—"}</span>`;
}

// ========== ADD TYPE MODAL ==========
function showAddTypeModal() {
  modalRoot.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:360px;margin:60px auto;">
      <h3 style="color:#fdd835;">Add Asset Type</h3>
      <form id="addTypeForm">
        <label>Name</label>
        <input type="text" id="typeName" required placeholder="e.g. Fire Extinguisher">
        <button class="assets-action-btn" type="submit">Add</button>
        <button class="action-btn" type="button" id="closeTypeModal">Cancel</button>
        <span id="typeFormMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  modalRoot.style.display = "flex";
  document.getElementById('closeTypeModal').onclick = () => modalRoot.style.display = "none";
  document.getElementById('addTypeForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('typeFormMsg');
    msg.textContent = "Adding...";
    const name = document.getElementById('typeName').value.trim();
    if (!name) {
      msg.textContent = "Enter a name.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${getTenantId()}/assetTypes`), { name, created_at: serverTimestamp() });
      msg.textContent = "Added!";
      msg.style.color = "#28e640";
      await loadAssetTypes();
      modalRoot.style.display = "none";
    } catch (error) {
      msg.textContent = "Error: " + (error.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
}

// ========== ADD LOCATION MODAL ==========
function showAddLocationModal() {
  modalRoot.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:360px;margin:60px auto;">
      <h3 style="color:#fdd835;">Add Location/Zone/Area</h3>
      <form id="addLocationForm">
        <label>Type</label>
        <select id="locationType">
          <option value="Location">Location</option>
          <option value="Zone">Zone</option>
          <option value="Area">Area</option>
          <option value="Custom">Custom</option>
        </select>
        <input type="text" id="customLabel" style="display:none;margin-top:6px;" placeholder="Custom label">
        <label>Name</label>
        <input type="text" id="locationName" required placeholder="e.g. Office 1">
        <button class="assets-action-btn" type="submit">Add</button>
        <button class="action-btn" type="button" id="closeLocationModal">Cancel</button>
        <span id="locationFormMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  modalRoot.style.display = "flex";
  const locationType = document.getElementById('locationType');
  const customLabel = document.getElementById('customLabel');
  locationType.onchange = () => {
    customLabel.style.display = locationType.value === 'Custom' ? '' : 'none';
  };
  document.getElementById('closeLocationModal').onclick = () => modalRoot.style.display = "none";
  document.getElementById('addLocationForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('locationFormMsg');
    msg.textContent = "Adding...";
    const type = locationType.value;
    const label = type === "Custom" ? customLabel.value.trim() : type;
    const name = document.getElementById('locationName').value.trim();
    if (!label || !name) {
      msg.textContent = "Fill out all fields.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${getTenantId()}/locations`), {
        type: label,
        name,
        created_at: serverTimestamp()
      });
      msg.textContent = "Added!";
      msg.style.color = "#28e640";
      await loadLocations();
      modalRoot.style.display = "none";
    } catch (error) {
      msg.textContent = "Error: " + (error.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
}

// ========== ADD ASSET MODAL ==========
function showAddAssetModal() {
  // Dropdowns for type and location
  let typeOptions = assetTypes.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
  let locationOptions = locations.map(l => `<option value="${l.name}">${l.name}</option>`).join('');
  modalRoot.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:440px;margin:60px auto;">
      <h3 style="color:#fdd835;">Add Asset</h3>
      <form id="addAssetForm">
        <label>Asset ID</label>
        <input type="text" id="assetId" required placeholder="e.g. Extinguisher001">
        <label>Type</label>
        <select id="assetType" required>
          <option value="">Select Type</option>
          ${typeOptions}
        </select>
        <label>Location</label>
        <select id="assetLocation" required>
          <option value="">Select Location</option>
          ${locationOptions}
        </select>
        <label>Assigned User</label>
        <input type="text" id="assignedUser" placeholder="Optional">
        <label>Status</label>
        <select id="assetStatus">
          <option value="in_service">In Service</option>
          <option value="out_of_service">Out of Service</option>
          <option value="moved">Moved</option>
        </select>
        <button class="assets-action-btn" type="submit">Add</button>
        <button class="action-btn" type="button" id="closeAssetModal">Cancel</button>
        <span id="assetFormMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  modalRoot.style.display = "flex";
  document.getElementById('closeAssetModal').onclick = () => modalRoot.style.display = "none";
  document.getElementById('addAssetForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('assetFormMsg');
    msg.textContent = "Adding...";
    const asset_id = document.getElementById('assetId').value.trim();
    const type = document.getElementById('assetType').value.trim();
    const location = document.getElementById('assetLocation').value.trim();
    const assigned_user = document.getElementById('assignedUser').value.trim();
    const status = document.getElementById('assetStatus').value;
    if (!asset_id || !type || !location) {
      msg.textContent = "Fill all required fields.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${getTenantId()}/assets`), {
        asset_id, type, location, assigned_user, status, created_at: serverTimestamp()
      });
      msg.textContent = "Added!";
      msg.style.color = "#28e640";
      await loadAssets();
      modalRoot.style.display = "none";
    } catch (error) {
      msg.textContent = "Error: " + (error.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
}

// ========== EDIT / DELETE ASSET (STUBS) ==========
window.editAsset = function(assetId) {
  // Placeholder: You can pop open an Edit Asset modal here
  alert(`Edit asset: ${assetId}\n(This feature coming soon)`);
};
window.deleteAsset = async function(assetId) {
  if (!confirm('Delete this asset?')) return;
  try {
    await updateDoc(doc(db, `clients/${getTenantId()}/assets/${assetId}`), { deleted: true });
    await loadAssets();
  } catch (error) {
    alert('Failed to delete asset.');
  }
};

