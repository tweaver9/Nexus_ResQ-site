import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAqnCQnFROLiVsQPIvgOe7mAciDiwCuLOg",
  authDomain: "nexus-res-q.firebaseapp.com",
  projectId: "nexus-res-q",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- Extract subdomain ---
function getSubdomain() {
  const parts = window.location.hostname.split(".");
  return parts.length > 2 ? parts[0] : null;
}

// --- Handle login submission ---
document.querySelector(".login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = e.target.username.value.trim();
  const password = e.target.password.value.trim();
  const errorDiv = document.getElementById("login-error");

  if (!username || !password) {
    errorDiv.textContent = "Missing username or password.";
    return;
  }

  const subdomain = getSubdomain();
  if (!subdomain) {
    errorDiv.textContent = "Invalid access. Use your client subdomain.";
    return;
  }

  try {
    const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, subdomain })
    });

    const data = await res.json(); // <-- You were missing this line

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg);
    }

    // Store session info as needed
    sessionStorage.setItem("nexusUser", JSON.stringify(data.user));
    console.log("User stored in session:", data.user);
    
    sessionStorage.setItem("tenant_id", subdomain);
    sessionStorage.setItem("username", username);
    sessionStorage.setItem("role", "user");

    window.location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    errorDiv.textContent = err.message || "Login failed.";
  }
});

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

  try {
    const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        code,
        newPassword,
        clientName
      })
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg);
    }

    alert('Password reset! You can now log in.');
    document.getElementById('reset-password-modal').style.display = 'none';
  } catch (err) {
    alert(err.message || "Password reset failed.");
  }
};
