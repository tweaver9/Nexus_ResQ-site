import { db } from './firebase.js';
import { collection, query, where, getDocs, addDoc, orderBy, doc, deleteDoc } from "firebase/firestore";

const tenantId = sessionStorage.getItem('tenant_id');
if (!tenantId) window.location.href = "login.html";

// DOM elements
const areaFilter = document.getElementById('areaFilter');
const assetSearch = document.getElementById('assetSearch');
const assetsTableBody = document.getElementById('assetsTableBody');
const noAssetsMsg = document.getElementById('noAssetsMsg');
const addAssetBtn = document.getElementById('addAssetBtn');
const modalRoot = document.getElementById('modal-root');

// State
let areas = [];
let assets = [];

// --- On load: fetch areas, then assets
window.addEventListener('DOMContentLoaded', async () => {
  await loadAreas();
  await loadAssets();
  areaFilter.addEventListener('change', renderAssets);
  assetSearch.addEventListener('input', renderAssets);
  addAssetBtn.addEventListener('click', openAddAssetModal);
});

// --- Load all areas for this client
async function loadAreas() {
  const areaSnap = await getDocs(collection(db, `clients/${tenantId}/locations`));
  areas = [];
  areaSnap.forEach(docSnap => {
    const a = docSnap.data();
    areas.push({ id: docSnap.id, name: a.name });
  });
  areaFilter.innerHTML = `<option value="all">All Areas</option>` +
    areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

// --- Load all assets for this client
async function loadAssets() {
  assets = [];
  const assetSnap = await getDocs(
    collection(db, `clients/${tenantId}/assets`)
  );
  assetSnap.forEach(docSnap => {
    assets.push({ ...docSnap.data(), id: docSnap.id });
  });
  renderAssets();
}

// --- Render asset rows (with filter and search)
function renderAssets() {
  const areaVal = areaFilter.value;
  const searchVal = assetSearch.value.trim().toLowerCase();

  let filtered = assets.filter(row => {
    if (areaVal !== "all" && row.locationId !== areaVal) return false;
    if (searchVal) {
      const all = `${row.assetId||''} ${row.type||''} ${row.location||''} ${row.assigned_user||''}`.toLowerCase();
      if (!all.includes(searchVal)) return false;
    }
    return true;
  });

  assetsTableBody.innerHTML = "";
  if (filtered.length === 0) {
    noAssetsMsg.style.display = "";
    return;
  }
  noAssetsMsg.style.display = "none";

  filtered.forEach(row => {
    const areaName = (areas.find(a => a.id === row.locationId) || {}).name || row.location || "—";
    let statusClass = "status-inservice";
    let statusLabel = row.status || "In Service";
    if (row.status) {
      if (row.status === "out_of_service") { statusClass = "status-outofservice"; statusLabel = "Out of Service"; }
      else if (row.status === "failed") { statusClass = "status-failed"; statusLabel = "Failed"; }
      else if (row.status === "emergency_ok") { statusClass = "status-emergencyok"; statusLabel = "Emerg. OK"; }
      else if (row.status === "moved") { statusClass = "status-moved"; statusLabel = "Moved"; }
    }

    // Last inspection and maintenance due placeholders
    let lastInspection = row.last_inspection ? new Date(row.last_inspection).toLocaleDateString() : "—";
    let hydroDue = row.hydro_due || "—";
    let annualDue = row.annual_due || "—";
    let maintenance = row.maintenance || "—";

    assetsTableBody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>${row.assetId || row.id || "—"}</td>
        <td>${row.type || "—"}</td>
        <td>${areaName}</td>
        <td>${row.assigned_user || "—"}</td>
        <td>${lastInspection}</td>
        <td>${hydroDue}</td>
        <td>${annualDue}</td>
        <td>${maintenance}</td>
        <td>
          <button class="action-btn" onclick="window.editAsset && editAsset('${row.id}')">Edit</button>
          <button class="action-btn" onclick="window.deleteAsset && deleteAsset('${row.id}', '${row.assetId||row.id}')">Delete</button>
        </td>
      </tr>
    `);
  });
}

// === Add Asset Modal Logic ===
function openAddAssetModal() {
  // Modal HTML (use your existing CSS styles)
  const modalHtml = `
    <div class="modal-content" style="background:#142b47;padding:32px 22px 20px 22px;max-width:410px;border-radius:14px;margin:auto;">
      <span class="close-btn" id="closeAddAssetModal" title="Close" style="position:absolute;right:16px;top:14px;font-size:1.8em;cursor:pointer;color:#fdd835;">&times;</span>
      <h2 style="color:#fdd835;margin-bottom:16px;">Add New Asset</h2>
      <form id="addAssetForm" autocomplete="off">
        <label>Asset ID</label>
        <input id="modalAssetId" type="text" maxlength="40" required placeholder="e.g. Extinguisher001">
        <label>Type</label>
        <input id="modalAssetType" type="text" maxlength="30" required placeholder="e.g. Extinguisher">
        <label>Area/Location</label>
        <select id="modalLocationId" required>
          <option value="">Select Area</option>
          ${areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
        </select>
        <label>Assigned User</label>
        <input id="modalAssignedUser" type="text" maxlength="30" placeholder="Optional">
        <label>Status</label>
        <select id="modalStatus">
          <option value="in_service">In Service</option>
          <option value="out_of_service">Out of Service</option>
          <option value="failed">Failed</option>
          <option value="emergency_ok">Emerg. OK</option>
          <option value="moved">Moved</option>
        </select>
        <label>Hydro Due (date)</label>
        <input id="modalHydroDue" type="date">
        <label>Annual Due (date)</label>
        <input id="modalAnnualDue" type="date">
        <label>Maintenance</label>
        <input id="modalMaintenance" type="text" maxlength="50" placeholder="Optional notes">
        <button type="submit" style="margin-top:18px;">Add Asset</button>
        <div class="form-message" id="modalAssetMsg" style="margin-top:8px;"></div>
      </form>
    </div>
  `;

  modalRoot.innerHTML = modalHtml;
  modalRoot.style.display = "flex";

  document.getElementById('closeAddAssetModal').onclick = closeAddAssetModal;
  document.getElementById('addAssetForm').onsubmit = handleAddAsset;
  // Close modal on outside click
  modalRoot.onclick = function(e) {
    if (e.target === modalRoot) closeAddAssetModal();
  }
}

function closeAddAssetModal() {
  modalRoot.style.display = "none";
  modalRoot.innerHTML = "";
}

async function handleAddAsset(e) {
  e.preventDefault();
  const msg = document.getElementById('modalAssetMsg');
  msg.style.color = "#fdd835";
  msg.textContent = "Adding...";
  const assetId = document.getElementById('modalAssetId').value.trim();
  const type = document.getElementById('modalAssetType').value.trim();
  const locationId = document.getElementById('modalLocationId').value;
  const assigned_user = document.getElementById('modalAssignedUser').value.trim();
  const status = document.getElementById('modalStatus').value;
  const hydro_due = document.getElementById('modalHydroDue').value;
  const annual_due = document.getElementById('modalAnnualDue').value;
  const maintenance = document.getElementById('modalMaintenance').value.trim();

  if (!assetId || !type || !locationId) {
    msg.style.color = "#ff5050";
    msg.textContent = "Asset ID, Type, and Area are required.";
    return;
  }

  try {
    await addDoc(collection(db, `clients/${tenantId}/assets`), {
      assetId,
      type,
      locationId,
      assigned_user,
      status,
      hydro_due,
      annual_due,
      maintenance,
      last_inspection: null // New asset, no inspection yet
    });
    msg.style.color = "#28e640";
    msg.textContent = "Asset added!";
    setTimeout(() => {
      closeAddAssetModal();
      loadAssets();
    }, 900);
  } catch (error) {
    msg.style.color = "#ff5050";
    msg.textContent = "Error: " + (error.message || "Unknown error");
  }
}

// === Edit and Delete stubs (expand as needed) ===
window.editAsset = function(assetId) {
  alert('Edit Asset: ' + assetId + '\n(Feature coming soon!)');
};
window.deleteAsset = async function(assetId, assetLabel) {
  if (!confirm(`Delete asset: ${assetLabel}?`)) return;
  try {
    await deleteDoc(doc(db, `clients/${tenantId}/assets`, assetId));
    await loadAssets();
  } catch (error) {
    alert("Failed to delete asset.");
  }
};
