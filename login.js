import { db } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

        const isMatch = bcrypt.compareSync(password, user.password);
        if (isMatch) {
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

  // --- PASSWORD RESET MODAL LOGIC ---
  function createResetModal() {
    if (document.getElementById('reset-password-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'reset-password-modal';
    modal.style = 'display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999;background:rgba(0,0,0,0.45);align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#22345a;padding:28px 24px;border-radius:12px;min-width:320px;max-width:90vw;">
        <div style="font-weight:600;font-size:1.1em;margin-bottom:10px;">Reset Password</div>
        <form id="reset-password-form">
          <input type="text" id="reset-username" placeholder="Username (e.g. jdoe@clientname)" required style="width:100%;margin-bottom:10px;">
          <input type="text" id="reset-code" placeholder="Reset Code" required style="width:100%;margin-bottom:10px;">
          <input type="password" id="reset-new-password" placeholder="New Password" required style="width:100%;margin-bottom:10px;">
          <div style="text-align:right;">
            <button type="button" id="reset-cancel" class="explorer-btn danger">Cancel</button>
            <button type="submit" class="explorer-btn">Reset Password</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  createResetModal();

  document.getElementById('forgot-password-btn').onclick = function() {
    document.getElementById('reset-password-modal').style.display = 'flex';
  };

  document.getElementById('reset-cancel').onclick = function() {
    document.getElementById('reset-password-modal').style.display = 'none';
  };

  document.getElementById('reset-password-form').onsubmit = async function(e) {
    e.preventDefault();
    const username = document.getElementById('reset-username').value.trim();
    const code = document.getElementById('reset-code').value.trim();
    const newPassword = document.getElementById('reset-new-password').value.trim();

    // Username format: jdoe@clientname
    const parts = username.split('@');
    if (parts.length !== 2) {
      alert('Username must be in the format jdoe@clientname');
      return;
    }
    const clientName = parts[1];

    const userRef = doc(db, "clients", clientName, "users", username);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      alert('User not found.');
      return;
    }
    const user = userSnap.data();
    if (!user.reset_code || user.reset_code !== code) {
      alert('Invalid reset code.');
      return;
    }
    // Optionally: check code age (user.reset_code_created)
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await updateDoc(userRef, {
      password: hashedPassword,
      must_change_password: false,
      reset_code: null,
      reset_code_created: null
    });
    alert('Password reset! You can now log in.');
    document.getElementById('reset-password-modal').style.display = 'none';
  };
});
