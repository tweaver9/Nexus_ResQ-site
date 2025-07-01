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
const manageClientsBtn = document.getElementById('manageClientsBtn');
const clientManagerModal = document.getElementById('clientManagerModal');
const clientManagerModalContent = document.getElementById('clientManagerModalContent');

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

// ========== MANAGE CLIENTS MODAL (Skeleton) ==========

// Show modal on button click (for Nexus only)
manageClientsBtn.onclick = function () {
  clientManagerModal.style.display = 'flex';
  renderClientManager();
};

function closeClientManagerModal() {
  clientManagerModal.style.display = 'none';
}

// ESC closes modal
document.addEventListener('keydown', e => {
  if (e.key === "Escape") closeClientManagerModal();
});

// Click outside closes modal
clientManagerModal.onclick = function(e) {
  if (e.target === clientManagerModal) closeClientManagerModal();
};

// Placeholder function for now: UI will be built out further
function renderClientManager() {
  clientManagerModalContent.innerHTML = `
    <h2 style="color:#36ff71;margin-bottom:26px;text-align:center;">Client Manager</h2>
    <div style="text-align:center;margin:30px 0 36px 0;color:#eee;">
      <b>All client/user/asset management will appear here.<br>
      (Coming soon!)</b>
    </div>
    <button class="manage-btn" onclick="window.closeClientManagerModal()" style="margin:0 auto;">Close</button>
  `;
}
// Expose for modal close button
window.closeClientManagerModal = closeClientManagerModal;

