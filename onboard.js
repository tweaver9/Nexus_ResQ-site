import { db, storage } from './firebase.js';
import {
  collection, addDoc, setDoc, doc, getDocs, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Restrict to Nexus owners
if (sessionStorage.role !== 'nexus') {
  document.body.innerHTML = '<div style="color:#fdd835;font-size:1.2em;margin:64px auto;max-width:380px;text-align:center;">Access Denied<br>This page is restricted to Nexus Owners.</div>';
  throw new Error("Not authorized");
}

// --------- Add Client -----------
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
    // 1. Create client
    const clientRef = await addDoc(collection(db, "clients"), {
      name: clientName,
      created_at: serverTimestamp()
    });
    const clientId = clientRef.id;
    // 2. Upload logo
    const logoUrl = await uploadLogoAndGetUrl(logoFile, clientId);
    await updateDoc(doc(db, "clients", clientId), { logo_url: logoUrl });
    // 3. Add admin user
    await addDoc(collection(db, `clients/${clientId}/users`), {
      username: adminUsername,
      password: adminPassword,
      first_name: adminFirst,
      last_name: adminLast,
      role: "admin",
      mustChangePassword: true,
      created_at: serverTimestamp()
    });
    onboardCreds.innerHTML = `<b>Client successfully created!</b><br><br>
      <b>Client Name:</b> ${clientName}<br>
      <b>Client ID:</b> ${clientId}<br>
      <b>Admin Username:</b> <code>${adminUsername}</code><br>
      <b>Default Password:</b> <code>${adminPassword}</code><br>
      <b>Logo URL:</b> <a href="${logoUrl}" target="_blank" style="color:#fdd835;">View Logo</a>
    `;
    onboardCreds.style.display = "block";
    clientFormMsg.textContent = "";
    await refreshClientDropdown(clientId);
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

// -------- Global Asset Type Section ----------
// Add asset type with frequency and multiline questions

const addAssetTypeForm = document.getElementById('addAssetTypeForm');
const globalAssetTypeName = document.getElementById('globalAssetTypeName');
const globalFrequencySelect = document.getElementById('globalFrequencySelect');
const globalAssetTypeQuestions = document.getElementById('globalAssetTypeQuestions');
const addAssetTypeMsg = document.getElementById('addAssetTypeMsg');

addAssetTypeForm.onsubmit = async function(e) {
  e.preventDefault();
  addAssetTypeMsg.style.color = "#fdd835";
  addAssetTypeMsg.textContent = "Adding asset type...";
  const name = globalAssetTypeName.value.trim();
  let frequency = globalFrequencySelect.value;
  const questions = globalAssetTypeQuestions.value
    .split('\n')
    .map(q => q.trim())
    .filter(q => q);

  if (!name || !frequency || questions.length === 0) {
    addAssetTypeMsg.style.color = "#ff5050";
    addAssetTypeMsg.textContent = "Please enter a name, select frequency, and add at least one question.";
    return;
  }

  try {
    // Store each frequency block as its own array in doc (e.g. questions_monthly)
    let freqField = {};
    freqField[`questions_${frequency}`] = questions;
    await addDoc(collection(db, "assetTypes"), {
      name,
      frequencies: [frequency],
      ...freqField,
      created_at: serverTimestamp()
    });
    addAssetTypeMsg.style.color = "#28e640";
    addAssetTypeMsg.textContent = "Global asset type added!";
    addAssetTypeForm.reset();
    await refreshAssetTypeDropdown();
  } catch (err) {
    addAssetTypeMsg.style.color = "#ff5050";
    addAssetTypeMsg.textContent = "Error: " + (err.message || "Unknown error");
  }
};

// -------- Assign Asset to Client ----------
const assignAssetForm = document.getElementById('assignAssetForm');
const clientSelect = document.getElementById('clientSelect');
const assetTypeSelect = document.getElementById('assetTypeSelect');
const assetIdInput = document.getElementById('assetId');
const assetLocationInput = document.getElementById('assetLocation');
const serialNoInput = document.getElementById('serialNo');
const assignedUserInput = document.getElementById('assignedUser');
const assignAssetMsg = document.getElementById('assignAssetMsg');

assignAssetForm.onsubmit = async function(e) {
  e.preventDefault();
  assignAssetMsg.style.color = "#fdd835";
  assignAssetMsg.textContent = "Assigning asset...";
  const clientId = clientSelect.value;
  const assetTypeId = assetTypeSelect.value;
  const assetId = assetIdInput.value.trim();
  const location = assetLocationInput.value.trim();
  const serialNo = serialNoInput.value.trim();
  const assignedUser = assignedUserInput.value.trim();

  if (!clientId || !assetTypeId || !assetId || !location) {
    assignAssetMsg.style.color = "#ff5050";
    assignAssetMsg.textContent = "Fill out all required fields.";
    return;
  }
  try {
    await addDoc(collection(db, `clients/${clientId}/assets`), {
      asset_id: assetId,
      asset_type_id: assetTypeId,
      location,
      serial_no: serialNo,
      assigned_user: assignedUser,
      created_at: serverTimestamp()
    });
    assignAssetMsg.style.color = "#28e640";
    assignAssetMsg.textContent = "Asset assigned to client!";
    assignAssetForm.reset();
  } catch (err) {
    assignAssetMsg.style.color = "#ff5050";
    assignAssetMsg.textContent = "Error: " + (err.message || "Unknown error");
  }
};

// ------ Dropdown Populators -------
async function refreshClientDropdown(selectedId = null) {
  clientSelect.innerHTML = '<option value="">Select client...</option>';
  const snap = await getDocs(collection(db, "clients"));
  snap.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;
    clientSelect.innerHTML += `<option value="${id}" ${id === selectedId ? 'selected' : ''}>${c.name || id}</option>`;
  });
}
async function refreshAssetTypeDropdown(selectedId = null) {
  assetTypeSelect.innerHTML = '<option value="">Select asset type...</option>';
  const snap = await getDocs(collection(db, "assetTypes"));
  snap.forEach(docSnap => {
    const at = docSnap.data();
    const id = docSnap.id;
    assetTypeSelect.innerHTML += `<option value="${id}" ${id === selectedId ? 'selected' : ''}>${at.name || id}</option>`;
  });
}

// Initial dropdown population:
refreshClientDropdown();
refreshAssetTypeDropdown();
