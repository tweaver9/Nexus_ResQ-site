// 1. Supabase setup
const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. Get tenant_id from sessionStorage
const tenantId = sessionStorage.getItem('tenant_id');

// 3. DOM references
const inspectionsTableBody = document.getElementById('inspectionsTableBody');
const noInspectionsMsg = document.getElementById('noInspectionsMsg');
const areaFilter = document.getElementById('areaFilter');
const assetTypeFilter = document.getElementById('assetTypeFilter');
const searchInput = document.getElementById('inspectionSearch');

// 4. State for filters (JS only)
let inspections = [];
let areas = [];
let assetTypes = [];

// 5. On load: fetch all data
window.addEventListener('DOMContentLoaded', async () => {
  if (!tenantId) {
    window.location.href = "login.html";
    return;
  }
  await loadAreas();
  await loadAssetTypes();
  await loadInspections();
  attachFilterListeners();
});

// 6. Fetch areas
async function loadAreas() {
  const { data } = await supabase
    .from('areas')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  if (data) {
    areas = data;
    areaFilter.innerHTML = `<option value="all">All Areas</option>` +
      areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  }
}

// 7. Fetch asset types
async function loadAssetTypes() {
  const { data } = await supabase
    .from('asset_types')
    .select('id, name')
    .order('name', { ascending: true });
  if (data) {
    assetTypes = data;
    assetTypeFilter.innerHTML = `<option value="all">All Types</option>` +
      assetTypes.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  }
}

// 8. Fetch inspections
async function loadInspections() {
  const { data } = await supabase
    .from('inspections')
    .select(`
      id, created_at, asset_id, asset_type, area_id, inspected_by, status, answers, comments, location, hydro_due
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  inspections = data || [];
  renderInspections();
}

// 9. Render function
function renderInspections() {
  const areaVal = areaFilter.value;
  const typeVal = assetTypeFilter.value;
  const searchVal = searchInput.value.toLowerCase();

  let filtered = inspections.filter(row => {
    if (areaVal !== "all" && row.area_id != areaVal) return false;
    if (typeVal !== "all" && row.asset_type != typeVal) return false;
    if (searchVal) {
      // Search in asset id, inspected_by, or comments
      return (
        (row.asset_id && row.asset_id.toLowerCase().includes(searchVal)) ||
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
    const areaName = (areas.find(a => a.id == row.area_id) || {}).name || "—";
    const typeName = (assetTypes.find(t => t.id == row.asset_type) || {}).name || "—";
    let statusBadge = '';
    if (row.status === "passed") statusBadge = `<span class="status-badge status-passed">Passed</span>`;
    else if (row.status === "failed") statusBadge = `<span class="status-badge status-failed">Failed</span>`;
    else if (row.status === "out_of_service") statusBadge = `<span class="status-badge status-outofservice">Out of Service</span>`;
    else if (row.status === "emergency_ok") statusBadge = `<span class="status-badge status-emergencyok">Emerg. OK</span>`;
    else statusBadge = `<span class="status-badge">${row.status}</span>`;

    inspectionsTableBody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
        <td>${row.asset_id || "—"}</td>
        <td>${typeName}</td>
        <td>${areaName}</td>
        <td>${row.inspected_by || "—"}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="actions-btn" onclick="viewInspectionDetails('${row.id}')">
            <span style="font-size:1.2em;" title="View Details">&#128269;</span>
          </button>
        </td>
        <td>${row.comments || ""}</td>
      </tr>
    `);
  });
}

// --- Modal/Details popup for Results button ---
window.viewInspectionDetails = async function(inspectionId) {
  // Fetch the full inspection details (with answers)
  const { data: inspection, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', inspectionId)
    .single();

  if (error || !inspection) {
    alert("Could not load inspection details.");
    return;
  }

  // Lookup area and asset type names
  const areaName = (areas.find(a => a.id == inspection.area_id) || {}).name || "—";
  const typeName = (assetTypes.find(t => t.id == inspection.asset_type) || {}).name || "—";
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
          <div><b>Asset ID:</b> ${inspection.asset_id || "—"}</div>
          <div><b>Location:</b> ${inspection.location || "—"}</div>
          <div><b>Hydro Due:</b> ${inspection.hydro_due || "—"}</div>
          <div><b>Inspected By:</b> ${inspection.inspected_by || "—"}</div>
          <div><b>Date/Time:</b> ${inspection.created_at ? new Date(inspection.created_at).toLocaleString() : "—"}</div>
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
    `<div><b>Asset ID:</b> ${inspection.asset_id || "—"}</div>`,
    `<div><b>Location:</b> ${inspection.location || "—"}</div>`,
    `<div><b>Hydro Due:</b> ${inspection.hydro_due || "—"}</div>`,
    `<div><b>Inspected By:</b> ${inspection.inspected_by || "—"}</div>`,
    `<div><b>Date/Time:</b> ${inspection.created_at ? new Date(inspection.created_at).toLocaleString() : "—"}</div>`,
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

// Utility to pick asset type image/icon (swap URLs for your own)
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
