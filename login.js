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
        if (user.username === username && user.password === password) {
          if (user.must_change_password) {
            // Save login state and redirect to password change
            localStorage.setItem('nexus_logged_in', 'true');
            localStorage.setItem('nexus_user', JSON.stringify({
              username: user.username,
              subdomain: subdomain,
              must_change_password: true
            }));
            window.location.href = "change-password.html";
          } else {
            localStorage.setItem('nexus_logged_in', 'true');
            localStorage.setItem('nexus_user', JSON.stringify({
              username: user.username,
              subdomain: subdomain,
              must_change_password: false
            }));
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
