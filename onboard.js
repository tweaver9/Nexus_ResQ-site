// onboard.js
import { db, storage } from './firebase.js';
import {
  collection, addDoc, doc, getDocs, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// === SECURITY: Restrict page to Nexus Owners only ===
if (!['nexus', 'owner'].includes(sessionStorage.role)) {
  document.body.innerHTML = '<div style="color:#fdd835;font-size:1.2em;margin:64px auto;max-width:380px;text-align:center;">Access Denied<br>This page is restricted to Nexus Owners.</div>';
  throw new Error("Not authorized");
}

// ---------------------
// 1. CLIENT MANAGEMENT
// ---------------------

const clientForm = document.getElementById('addClientForm');
const clientNameInput = document.getElementById('clientName');
const clientLogoInput = document.getElementById('clientLogo');
const adminFirstInput = document.getElementById('adminFirstName');
const adminLastInput = document.getElementById('adminLastName');
const adminUsernameInput = document.getElementById('adminUsername');
const adminPasswordInput = document.getElementById('adminPassword');
const clientFormMsg = document.getElementById('clientFormMsg');
const onboardCreds = document.getElementById('onboardCreds');

let newClientId = null;

// Username/password generator
function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 16);
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

// Handle Add Client Form Submit
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

  if (!clientName || !logoFile || !adminFirst || !adminLast || !adminUsername || !adminPassword) {
    clientFormMsg.style.color = "#ff5050";
    clientFormMsg.textContent = "Please fill out all fields and upload a logo.";
    clientForm.querySelector("#submitClientBtn").disabled = false;
    return;
  }

  try {
    // 1. Create client doc in Firestore
    const clientRef = await addDoc(collection(db, "clients"), {
      name: clientName,
      created_at: serverTimestamp()
    });
    newClientId = clientRef.id;

    // 2. Process and upload logo
    const logoUrl = await uploadLogoAndGetUrl(logoFile, newClientId);

    // 3. Update client doc with logo
    await updateDoc(doc(db, "clients", newClientId), { logo_url: logoUrl });

    // 4. Create admin user in subcollection
    await addDoc(collection(db, `clients/${newClientId}/users`), {
      username: adminUsername,
      password: adminPassword,
      first_name: adminFirst,
      last_name: adminLast,
      role: "admin",
      mustChangePassword: true,
      created_at: serverTimestamp()
    });

    // 5. Show credentials, refresh client dropdown
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
    await refreshClientDropdown(newClientId);
    clientForm.reset();
    autoFillAdmin();
  } catch (err) {
    clientFormMsg.style.color = "#ff5050";
    clientFormMsg.textContent = "Error: " + (err.message || "Unknown error");
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

// ----------------------
// 2. GLOBAL ASSET TYPES
// ----------------------

// Add Asset Type globally (all clients can use)
const assetTypeForm = document.getElementById('addAssetTypeForm');
if (assetTypeForm) {
  assetTypeForm.onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('assetTypeFormMsg');
    msg.textContent = "Adding...";
    const name = document.getElementById('globalAssetTypeName').value.trim();
    if (!name) {
      msg.style.color = "#ff5050";
      msg.textContent = "Enter a name.";
      return;
    }
    try {
      await addDoc(collection(db, "assetTypes"), { name, created_at: serverTimestamp() });
      msg.style.color = "#28e640";
      msg.textContent = "Added!";
      this.reset();
      await loadAssetTypes(); // Refresh dropdowns after add
    } catch (error) {
      msg.style.color = "#ff5050";
      msg.textContent = "Error: " + (error.message || "Unknown error");
    }
  };
}

// Populate asset types dropdown (for assign asset form)
const assetTypeSelect = document.getElementById('assetTypeSelect');
async function loadAssetTypes() {
  if (!assetTypeSelect) return;
  assetTypeSelect.innerHTML = '<option value="">(Select Asset Type...)</option>';
  const snap = await getDocs(collection(db, "assetTypes"));
  snap.forEach(docSnap => {
    const t = docSnap.data();
    assetTypeSelect.innerHTML += `<option value="${docSnap.id}">${t.name || docSnap.id}</option>`;
  });
}
if (assetTypeSelect) loadAssetTypes();

// ---------------------
// 3. ASSIGN ASSET TO CLIENT
// ---------------------

const assignAssetForm = document.getElementById('assignAssetForm');
const clientSelect = document.getElementById('clientSelect');
async function loadClients() {
  if (!clientSelect) return;
  clientSelect.innerHTML = '<option value="">(Select Client...)</option>';
  const snap = await getDocs(collection(db, "clients"));
  snap.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;
    clientSelect.innerHTML += `<option value="${id}">${c.name || id}</option>`;
  });
}
if (clientSelect) loadClients();

if (assignAssetForm) {
  assignAssetForm.onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('assignAssetMsg');
    msg.style.color = "#fdd835";
    msg.textContent = "Adding asset...";
    const clientId = clientSelect.value;
    const typeId = assetTypeSelect.value;
    const assetId = document.getElementById('assetId').value.trim();
    const location = document.getElementById('assetLocation').value.trim();
    const serialNo = document.getElementById('serialNo').value.trim();
    const assignedUser = document.getElementById('assignedUser').value.trim();
    const supplemental = document.getElementById('supplementalQuestions').value.trim();
    const supplementalArr = supplemental
      ? supplemental.split(',').map(q => q.trim()).filter(Boolean)
      : [];
    if (!clientId || !typeId || !assetId || !location) {
      msg.style.color = "#ff5050";
      msg.textContent = "Please fill all required fields.";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${clientId}/assets`), {
        type_id: typeId,
        asset_id: assetId,
        location,
        serial_no: serialNo || null,
        assigned_to: assignedUser || null,
        supplemental_questions: supplementalArr,
        created_at: serverTimestamp()
      });
      msg.style.color = "#28e640";
      msg.textContent = "Asset added!";
      this.reset();
    } catch (error) {
      msg.style.color = "#ff5050";
      msg.textContent = "Error: " + (error.message || "Unknown error");
    }
  };
}

// ------------
// 4. UTILS
// ------------

async function refreshClientDropdown(selectId = null) {
  if (!clientSelect) return;
  clientSelect.innerHTML = '<option value="">(Select Client...)</option>';
  const snap = await getDocs(collection(db, "clients"));
  snap.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;
    clientSelect.innerHTML += `<option value="${id}" ${id === selectId ? 'selected' : ''}>${c.name || id}</option>`;
  });
}
