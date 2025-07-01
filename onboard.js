import { db, storage } from './firebase.js';
import {
  collection, addDoc, setDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ========== SECURITY ==========
if (sessionStorage.role !== 'nexus') {
  document.body.innerHTML = '<div style="color:#fdd835;font-size:1.2em;margin:64px auto;max-width:380px;text-align:center;">Access Denied<br>This page is restricted to Nexus Owners.</div>';
  throw new Error("Not authorized");
}

// ======= CLIENT CREATION =======
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
    // 1. Add client doc
    let clientRef;
    try {
      clientRef = await addDoc(collection(db, "clients"), {
        name: clientName,
        created_at: serverTimestamp()
      });
      console.log('Client doc created:', clientRef.id);
    } catch (err) {
      throw new Error("Failed to create client doc: " + err.message);
    }
    const clientId = clientRef.id;

    // 2. Upload logo
    let logoUrl;
    try {
      logoUrl = await uploadLogoAndGetUrl(logoFile, clientId);
      console.log('Logo uploaded:', logoUrl);
    } catch (err) {
      throw new Error("Failed to upload logo: " + err.message);
    }

    // 3. Update client with logo URL
    try {
      await updateDoc(doc(db, "clients", clientId), { logo_url: logoUrl });
      console.log('Client doc updated with logo URL');
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
      console.log('Admin user added');
    } catch (err) {
      throw new Error("Failed to add admin user: " + err.message);
    }

    // 5. Success!
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

// ============ ASSET TYPE & FREQUENCY QUESTIONS =============
const assetTypeSelect = document.getElementById('assetTypeSelect');
const newAssetTypeInput = document.getElementById('newAssetTypeInput');
const frequencySelect = document.getElementById('frequencySelect');
const newFrequencyInput = document.getElementById('newFrequencyInput');
const questionsList = document.getElementById('questionsList');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const assetTypeQuestionForm = document.getElementById('assetTypeQuestionForm');
const assetTypeQuestionMsg = document.getElementById('assetTypeQuestionMsg');
const currentQuestionsContainer = document.getElementById('currentQuestionsContainer');

// Track questions in local UI state
let currentQuestions = [];

function renderQuestionsList() {
  questionsList.innerHTML = '';
  currentQuestions.forEach((q, idx) => {
    const row = document.createElement('div');
    row.className = 'question-row';
    row.innerHTML = `
      <input type="text" value="${q}" placeholder="Inspection question" />
      <button type="button" class="remove-q-btn" data-idx="${idx}">&times;</button>
    `;
    row.querySelector('input').oninput = e => currentQuestions[idx] = e.target.value;
    row.querySelector('.remove-q-btn').onclick = () => {
      currentQuestions.splice(idx, 1);
      renderQuestionsList();
    };
    questionsList.appendChild(row);
  });
}
function addEmptyQuestion() {
  currentQuestions.push('');
  renderQuestionsList();
}
addQuestionBtn.onclick = addEmptyQuestion;
// Start with 5 empty lines
for (let i = 0; i < 5; ++i) addEmptyQuestion();

// If asset type/frequency changes, clear questions
function resetQuestionsForm() {
  currentQuestions = [];
  for (let i = 0; i < 5; ++i) currentQuestions.push('');
  renderQuestionsList();
}
assetTypeSelect.onchange = resetQuestionsForm;
frequencySelect.onchange = resetQuestionsForm;
newAssetTypeInput.oninput = resetQuestionsForm;
newFrequencyInput.oninput = resetQuestionsForm;

// -------- Asset Type + Frequency submit --------
assetTypeQuestionForm.onsubmit = async function(e) {
  e.preventDefault();
  assetTypeQuestionMsg.style.color = "#fdd835";
  assetTypeQuestionMsg.textContent = "Saving...";

  // 1. Figure out asset type (existing or new)
  let assetTypeName = newAssetTypeInput.value.trim() || assetTypeSelect.options[assetTypeSelect.selectedIndex]?.dataset.displayName || assetTypeSelect.value;
  if (!assetTypeName) {
    assetTypeQuestionMsg.style.color = "#ff5050";
    assetTypeQuestionMsg.textContent = "Asset type required.";
    return;
  }
  // 2. Frequency
  let freq = newFrequencyInput.value.trim() || frequencySelect.value;
  if (!freq) {
    assetTypeQuestionMsg.style.color = "#ff5050";
    assetTypeQuestionMsg.textContent = "Frequency required.";
    return;
  }
  // 3. Questions
  const questions = currentQuestions.map(q => q.trim()).filter(q => q);
  if (!questions.length) {
    assetTypeQuestionMsg.style.color = "#ff5050";
    assetTypeQuestionMsg.textContent = "Please enter at least one question.";
    return;
  }

  try {
    // Always use slug for document ID, pretty name for "name" field
    let assetTypeId = slug(assetTypeName);
    const atDocRef = doc(db, "assetTypes", assetTypeId);
    const currDocSnap = await getDoc(atDocRef);

    if (currDocSnap.exists()) {
      // Update existing: set/merge frequency
      let freqKey = `questions_${freq.toLowerCase()}`;
      let update = {};
      update[freqKey] = questions;
      // Merge/append frequency to .frequencies array if not present
      const currDoc = currDocSnap.data();
      let newFreqArr = Array.isArray(currDoc.frequencies) ? currDoc.frequencies.slice() : [];
      if (!newFreqArr.includes(freq)) newFreqArr.push(freq);
      update['frequencies'] = newFreqArr;
      await updateDoc(atDocRef, update);
      assetTypeQuestionMsg.style.color = "#28e640";
      assetTypeQuestionMsg.textContent = `Questions for "${currDoc.name}" (${freq}) updated!`;
      await refreshAssetTypeDropdown(assetTypeId);
    } else {
      // Create new assetType with slug ID and display name
      let docData = {
        name: assetTypeName,     // Pretty name for UI
        frequencies: [freq],
      };
      docData[`questions_${freq.toLowerCase()}`] = questions;
      await setDoc(atDocRef, docData);
      assetTypeQuestionMsg.style.color = "#28e640";
      assetTypeQuestionMsg.textContent = `Asset type "${assetTypeName}" created with ${freq} questions.`;
      await refreshAssetTypeDropdown();
    }
    // After save, refresh current questions view
    await showCurrentQuestions(assetTypeName);
    resetQuestionsForm();
  } catch (err) {
    assetTypeQuestionMsg.style.color = "#ff5050";
    assetTypeQuestionMsg.textContent = "Error: " + (err.message || "Unknown error");
  }
};

// ---- Show all questions for asset type ----
async function showCurrentQuestions(assetTypeName) {
  if (!assetTypeName) {
    currentQuestionsContainer.innerHTML = '';
    return;
  }
  // Always lookup by slug
  let docId = slug(assetTypeName);
  let docRef = doc(db, "assetTypes", docId);
  let docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    currentQuestionsContainer.innerHTML = '';
    return;
  }
  let docData = docSnap.data();
  let html = `<div class="question-list-title">Current Frequencies & Questions for "${docData.name}":</div>`;
  for (const freq of docData.frequencies || []) {
    let fq = freq.toLowerCase();
    let qArr = docData[`questions_${fq}`];
    if (Array.isArray(qArr)) {
      html += `<div class="freq-tag">${freq}</div>`;
      html += `<div class="current-questions-list">`;
      qArr.forEach((q, i) => {
        html += `<div style="color:#eee;margin-left:16px;">${i+1}. ${q}</div>`;
      });
      html += `</div>`;
    }
  }
  currentQuestionsContainer.innerHTML = html;
}

// Populate asset type dropdown (slug as value, pretty name as label)
async function refreshAssetTypeDropdown(selectedId = null) {
  assetTypeSelect.innerHTML = '<option value="">Select asset type...</option>';
  const snap = await getDocs(collection(db, "assetTypes"));
  snap.forEach(docSnap => {
    const at = docSnap.data();
    const id = docSnap.id; // slug
    // Use data-display-name for safe retrieval if needed
    assetTypeSelect.innerHTML += `<option value="${id}" data-display-name="${at.name}">${at.name}</option>`;
  });
}

// Populate client dropdown (for completeness)
async function refreshClientDropdown(selectedId = null) {
  if (!document.getElementById('clientSelect')) return; // Only if present
  const clientSelect = document.getElementById('clientSelect');
  clientSelect.innerHTML = '<option value="">Select client...</option>';
  const snap = await getDocs(collection(db, "clients"));
  snap.forEach(docSnap => {
    const c = docSnap.data();
    const id = docSnap.id;
    clientSelect.innerHTML += `<option value="${id}" ${id === selectedId ? 'selected' : ''}>${c.name || id}</option>`;
  });
}

// ===== Initial population (ALWAYS LIVE) =====
document.addEventListener("DOMContentLoaded", () => {
  refreshClientDropdown();
  refreshAssetTypeDropdown();
});
