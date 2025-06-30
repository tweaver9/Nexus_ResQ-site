import { db } from './firebase.js';
import { collection, query, where, getDocs, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.addEventListener('DOMContentLoaded', async function() {
  const loginForm = document.querySelector('.login-form');
  const logoImg = document.getElementById('client-logo');
  const errorDiv = document.getElementById('login-error');

  // --- 1. Detect tenant/client by subdomain ---
  const subdomain = window.location.hostname.split('.')[0];

  // --- 2. Fetch client/tenant doc for this subdomain ---
  let client = null, clientId = null;
  try {
    const q = query(collection(db, "clients"), where("subdomain", "==", subdomain));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error();
    client = snapshot.docs[0].data();
    clientId = snapshot.docs[0].id;
  } catch {
    errorDiv.textContent = "Unknown client. Please use your assigned company link.";
    if (loginForm) loginForm.style.display = "none";
    return;
  }

  // --- 3. Save tenant_id (the client's id) for this session ---
  sessionStorage.setItem('tenant_id', clientId);

  // --- 4. Set only the client logo (no Nexus logo, no color variables) ---
  if (client.logo_url && logoImg) logoImg.src = client.logo_url;

  // (Optional: set the login heading if you want)
  const loginTitleEl = document.getElementById('client-login-title');
  if (loginTitleEl) loginTitleEl.textContent = `${client.name} Login`;

  // --- 5. Login form handler ---
  if (loginForm) loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value.trim();
    errorDiv.textContent = '';

    try {
      // --- 6. Query for user with this username under this client ---
      // Option 1: users subcollection under client
      const usersCol = collection(db, `clients/${clientId}/users`);
      const q = query(usersCol, where("username", "==", username));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        errorDiv.textContent = "User not found for this client.";
        return;
      }
      const userDoc = snapshot.docs[0];
      const user = userDoc.data();

      // --- 7. Check password (plaintext, to match old behavior) ---
      if (user.password !== password) {
        errorDiv.textContent = "Incorrect password.";
        return;
      }

      // --- 8. Store session data & redirect to dashboard ---
      sessionStorage.setItem('role', user.role);
      sessionStorage.setItem('username', user.username);
      // tenant_id already saved above

      window.location.href = "dashboard.html";
    } catch (err) {
      errorDiv.textContent = "Login error. Please try again.";
    }
  });
});
