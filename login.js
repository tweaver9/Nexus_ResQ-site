import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Utility: Get the subdomain from the window.location
function getSubdomain() {
  const host = window.location.hostname;
  // e.g. "citgo.nexusresq.com" -> "citgo"
  if (!host.includes('nexusresq.com')) return null;
  return host.split('.')[0];
}

async function loadClientLogo() {
  const subdomain = getSubdomain();
  if (!subdomain) return; // fallback

  const docRef = doc(db, "clients", subdomain);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const client = snap.data();
    const logoUrl = client.logoUrl || client.logo_url || "";
    if (logoUrl) {
      document.getElementById('client-logo').src = logoUrl;
      document.getElementById('client-logo').alt = client.name + " logo";
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadClientLogo();

  // Add login form handler
  const form = document.querySelector('.login-form');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const username = form.elements['username'].value.trim();
      const password = form.elements['password'].value.trim();
      const subdomain = getSubdomain();
      const errorDiv = document.getElementById('login-error');
      errorDiv.textContent = "";

      if (!username || !password) {
        errorDiv.textContent = "Please enter both username and password.";
        return;
      }
      if (!subdomain) {
        errorDiv.textContent = "Invalid subdomain. Please access via your client portal link.";
        return;
      }

      try {
        // Try to get the user doc (admin only for now)
        const userRef = doc(db, "clients", subdomain, "users", "admin");
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          errorDiv.textContent = "User not found.";
          return;
        }
        const user = userSnap.data();
        const clientRef = doc(db, "clients", subdomain);
        const clientSnap = await getDoc(clientRef);
        const client = clientSnap.exists() ? clientSnap.data() : null;

        if (user.username === username && user.password === password) {
          sessionStorage.setItem('tenant_id', subdomain);
          sessionStorage.setItem('username', user.username);
          sessionStorage.setItem('role', user.role || 'admin');
          // Set logo for dashboard
          sessionStorage.setItem('clientLogoUrl', (client && (client.logo_url || client.logoUrl)) || "");
          sessionStorage.setItem('userDocId', 'admin'); // or use user.username if that's your doc ID

          if (user.must_change_password) {
            window.location.href = "change-password.html";
          } else {
            window.location.href = "dashboard.html";
          }
        } else {
          errorDiv.textContent = "Invalid username or password.";
        }
      } catch (err) {
        errorDiv.textContent = "Login error: " + err.message;
      }
    });
  }
});
