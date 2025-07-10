// view-inspections.js (Firebase version)
import {
  db,
  getCurrentClientSubdomain,
  getClientCollection,
  getClientDoc
} from './firebase.js';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";

// 1. Get client subdomain from session
const currentClientSubdomain = getCurrentClientSubdomain();

// 2. DOM references
const inspectionsTableBody = document.getElementById('inspectionsTableBody');
const noInspectionsMsg = document.getElementById('noInspectionsMsg');
const areaFilter = document.getElementById('areaFilter');
const assetTypeFilter = document.getElementById('assetTypeFilter');
const searchInput = document.getElementById('inspectionSearch');

// 3. State for filters
let inspections = [];
let areas = [];
let assetTypes = [];

// 4. On load: fetch all data
window.addEventListener('DOMContentLoaded', async () => {
  if (!currentClientSubdomain) {
    window.location.href = "login.html";
    return;
  }
  await loadAreas();
  await loadAssetTypes();
  await loadInspections();
  attachFilterListeners();
});

// 5. Fetch areas
async function loadAreas() {
  areas = [];
  const areaSnap = await getDocs(getClientCollection(currentClientSubdomain, 'locations'));
  areaSnap.forEach(docSnap => {
    if (docSnap.id !== '_placeholder') {
      const area = docSnap.data();
      areas.push({ id: docSnap.id, name: area.name });
    }
  });
  areaFilter.innerHTML = `<option value="all">All Areas</option>` +
    areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

// 6. Fetch asset types
async function loadAssetTypes() {
  assetTypes = [];
  const typeSnap = await getDocs(collection(db, `clients/${tenantId}/assetTypes`));
  typeSnap.forEach(docSnap => {
    const type = docSnap.data();
    assetTypes.push({ id: docSnap.id, name: type.name });
  });
  assetTypeFilter.innerHTML = `<option value="all">All Types</option>` +
    assetTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

// 7. Fetch inspections
async function loadInspections() {
  inspections = [];
  const q = query(
    getClientCollection(currentClientSubdomain, 'inspectionRecords'),
    orderBy('timestamp', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    if (docSnap.id !== '_placeholder') {
      const d = docSnap.data();
      inspections.push({
        ...d,
        id: docSnap.id,
        timestamp: d.timestamp ? new Date(d.timestamp) : null
      });
    }
  });
  renderInspections();
}

// 8. Render function
function renderInspections() {
  const areaVal = areaFilter.value;
  const typeVal = assetTypeFilter.value;
  const searchVal = searchInput.value.toLowerCase();

  let filtered = inspections.filter(row => {
    if (areaVal !== "all" && row.locationId != areaVal) return false;
    if (typeVal !== "all" && row.assetTypeId != typeVal) return false;
    if (searchVal) {
      return (
        (row.assetId && row.assetId.toLowerCase().includes(searchVal)) ||
        (row.inspected_by && row.inspected_by.toLowerCase().includes(searchVal)) ||
        (row.comments && row.comments.toLowerCase().includes(searchVal))
      );
    }
    return true;
  });

  inspectionsTableBody.innerHTML = "";
  if (filtered.length === 0) {
    noInspectionsMsg.style.display = "";
    return;
  }
  noInspectionsMsg.style.display = "none";

  filtered.forEach(row => {
    const areaName = (areas.find(a => a.id == row.locationId) || {}).name || "—";
    const typeName = (assetTypes.find(t => t.id == row.assetTypeId) || {}).name || "—";
    let statusBadge = '';
    if (row.status === "passed") statusBadge = `<span class="status-badge status-passed">Passed</span>`;
    else if (row.status === "failed") statusBadge = `<span class="status-badge status-failed">Failed</span>`;
    else if (row.status === "out_of_service") statusBadge = `<span class="status-badge status-outofservice">Out of Service</span>`;
    else if (row.status === "emergency_ok") statusBadge = `<span class="status-badge status-emergencyok">Emerg. OK</span>`;
    else statusBadge = `<span class="status-badge">${row.status || ''}</span>`;

    inspectionsTableBody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${row.timestamp ? row.timestamp.toLocaleString() : "—"}</td>
        <td>${row.assetId || "—"}</td>
        <td>${typeName}</td>
        <td>${areaName}</td>
        <td>${row.inspected_by || "—"}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="actions-btn" onclick="window.viewInspectionDetails('${row.id}')">
            <span style="font-size:1.2em;" title="View Details">&#128269;</span>
          </button>
        </td>
        <td>${row.comments || ""}</td>
      </tr>
    `);
  });
}

// 9. Modal/Details popup for Results button
window.viewInspectionDetails = async function(inspectionId) {
  // Fetch the full inspection details (with answers)
  const docRef = getClientDoc(currentClientSubdomain, 'inspectionRecords', inspectionId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    alert("Could not load inspection details.");
    return;
  }
  const inspection = docSnap.data();

  // Lookup area and asset type names
  const areaName = (areas.find(a => a.id == inspection.locationId) || {}).name || "—";
  const typeName = (assetTypes.find(t => t.id == inspection.assetTypeId) || {}).name || "—";
  const answers = inspection.answers || [];

  // Build modal "driver's license" style HTML
  let answersHtml = '';
  if (Array.isArray(answers) && answers.length > 0) {
    answersHtml = `
      <table class="answers-table">
        <thead>
          <tr>
            <th>Question</th>
            <th>Answer</th>
          </tr>
        </thead>
        <tbody>
          ${answers.map(a => `<tr><td>${a.q || a.question}</td><td>${a.a || a.answer}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  } else {
    answersHtml = `<div style="color:#fdd835; margin: 6px 0 2px 0;">No answers recorded for this inspection.</div>`;
  }

  // Asset image by type
  const assetImageSrc = getAssetTypeImage(typeName);

  const modalHtml = `
    <div class="modal-content">
      <span class="close-btn" id="closeModalBtn" title="Close">&times;</span>
      <button id="printInspectionBtn" class="modal-print-btn" title="Print This Inspection">🖨️ Print</button>
      <div class="print-card">
        <div class="asset-image">
          ${assetImageSrc ? `<img src="${assetImageSrc}" style="width:96px;height:96px;">` : `<span>🛠️</span>`}
        </div>
        <div class="asset-title">${typeName}</div>
        <div class="info-list">
          <div><b>Asset ID:</b> ${inspection.assetId || "—"}</div>
          <div><b>Location:</b> ${inspection.location || "—"}</div>
          <div><b>Hydro Due:</b> ${inspection.hydro_due || "—"}</div>
          <div><b>Inspected By:</b> ${inspection.inspected_by || "—"}</div>
          <div><b>Date/Time:</b> ${inspection.timestamp ? new Date(inspection.timestamp).toLocaleString() : "—"}</div>
          <div><b>Area:</b> ${areaName}</div>
          <div><b>Status:</b> <span style="color:#fdd835;">${inspection.status}</span></div>
          <div><b>Comments:</b> ${inspection.comments || ""}</div>
        </div>
        <div class="qa-section">
          <h3 style="margin-top:12px;">Inspection Answers</h3>
          ${answersHtml}
        </div>
      </div>
    </div>
  `;

  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) {
    modalRoot.innerHTML = modalHtml;
    modalRoot.style.display = "flex";
  }

  // Print logic
  document.getElementById('printInspectionBtn').onclick = function(e) {
    e.stopPropagation();
    printInspectionCard(inspection, areaName, typeName);
  };

  // Close logic
  document.getElementById('closeModalBtn').onclick = function() {
    modalRoot.style.display = "none";
    modalRoot.innerHTML = "";
  };
  modalRoot.onclick = function(e) {
    if (e.target === modalRoot) {
      modalRoot.style.display = "none";
      modalRoot.innerHTML = "";
    }
  };
};

// Print card function
function printInspectionCard(inspection, areaName, typeName) {
  const assetImageSrc = getAssetTypeImage(typeName);
  const info = [
    `<div><b>Asset ID:</b> ${inspection.assetId || "—"}</div>`,
    `<div><b>Location:</b> ${inspection.location || "—"}</div>`,
    `<div><b>Hydro Due:</b> ${inspection.hydro_due || "—"}</div>`,
    `<div><b>Inspected By:</b> ${inspection.inspected_by || "—"}</div>`,
    `<div><b>Date/Time:</b> ${inspection.timestamp ? new Date(inspection.timestamp).toLocaleString() : "—"}</div>`,
    `<div><b>Area:</b> ${areaName}</div>`,
    `<div><b>Status:</b> <span style="color:#fdd835;">${inspection.status}</span></div>`,
    `<div><b>Comments:</b> ${inspection.comments || ""}</div>`
  ].join('');
  const answers = (Array.isArray(inspection.answers) && inspection.answers.length)
    ? inspection.answers.map(a => `<tr><th>${a.q || a.question}</th><td>${a.a || a.answer}</td></tr>`).join('')
    : `<tr><td colspan="2" style="color:#fdd835;">No answers recorded.</td></tr>`;

  const html = `
    <div class="print-card">
      <div class="asset-image">${assetImageSrc ? `<img src="${assetImageSrc}" style="width:96px;height:96px;">` : `<span>🛠️</span>`}</div>
      <div class="asset-title">${typeName}</div>
      <div class="info-list">${info}</div>
      <div class="qa-section">
        <table>
          <tbody>${answers}</tbody>
        </table>
      </div>
    </div>
  `;

  // Open print window with just the card
  const win = window.open('', '', 'width=370,height=600');
  win.document.write(`
    <html>
      <head>
        <title>Print Inspection Card</title>
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;600&display=swap" rel="stylesheet">
        <style>${getPrintCardCSS()}</style>
      </head>
      <body style="background:#0d1b2a; margin:0;">${html}</body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

// Utility to pick asset type image/icon
function getAssetTypeImage(typeName) {
  if (!typeName) return "";
  if (typeName.toLowerCase().includes('hydrant')) return "https://cdn.jsdelivr.net/gh/tweaver9/Nexus_ResQ-site/icons/hydrant.png";
  if (typeName.toLowerCase().includes('piv')) return "https://cdn.jsdelivr.net/gh/tweaver9/Nexus_ResQ-site/icons/piv.png";
  if (typeName.toLowerCase().includes('scba')) return "https://cdn.jsdelivr.net/gh/tweaver9/Nexus_ResQ-site/icons/scba.png";
  if (typeName.toLowerCase().includes('extinguisher')) return "https://cdn.jsdelivr.net/gh/tweaver9/Nexus_ResQ-site/icons/extinguisher.png";
  return "";
}

// Minimal CSS for print window
function getPrintCardCSS() {
  return `
    body { background: #0d1b2a !important; font-family: 'Oswald', sans-serif; }
    .print-card { width: 340px; min-height: 480px; background: #16243c; border-radius: 16px; box-shadow: 0 2px 18px #000a; color: #fff; margin: 0 auto; padding: 22px 18px 18px 18px; display: flex; flex-direction: column; align-items: center; position: relative; }
    .print-card .asset-image { width: 96px; height: 96px; object-fit: contain; border-radius: 10px; margin-bottom: 9px; background: #223052; display: flex; align-items: center; justify-content: center; }
    .print-card .asset-title { font-size: 1.3em; color: #fdd835; margin-bottom: 4px; text-align: center; }
    .print-card .info-list { width: 100%; margin: 0 0 10px 0; font-size: 1.05em; }
    .print-card .info-list div { margin-bottom: 3px; line-height: 1.14em; }
    .print-card .qa-section { margin-top: 10px; width: 100%; }
    .print-card .qa-section table { width: 100%; border-collapse: collapse; background: transparent; }
    .print-card .qa-section th, .print-card .qa-section td { font-size: 0.98em; padding: 2px 3px; color: #f2f2f2; }
    .print-card .qa-section th { color: #fdd835; text-align: left; font-weight: 600; }
    .print-card .qa-section td { text-align: right; }
  `;
}

// 10. Filter listeners
function attachFilterListeners() {
  areaFilter.addEventListener('change', renderInspections);
  assetTypeFilter.addEventListener('change', renderInspections);
  searchInput.addEventListener('input', renderInspections);
}
