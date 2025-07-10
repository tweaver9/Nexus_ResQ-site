import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Import bcryptjs for password validation
import bcrypt from "https://cdn.skypack.dev/bcryptjs@2.4.3";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAqnCQnFROLiVsQPIvgOe7mAciDiwCuLOg",
  authDomain: "nexus-res-q.firebaseapp.com",
  projectId: "nexus-res-q",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
    showError("Missing username or password.");
    return;
  }

  const subdomain = getSubdomain();
  if (!subdomain) {
    showError("Invalid access. Use your client subdomain.");
    return;
  }

  try {
    // First validate that the client exists
    const clientDocRef = doc(db, 'clients', subdomain);
    const clientDoc = await getDoc(clientDocRef);

    if (!clientDoc.exists()) {
      showError("Invalid client subdomain. Please check your URL.");
      return;
    }

    const clientData = clientDoc.data();

    // Find user by username in client-specific users collection
    const usersRef = collection(db, 'clients', subdomain, 'users');
    const userQuery = query(usersRef, where('username', '==', username));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      showError("Invalid username or password.");
      return;
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if user is active
    if (!userData.active) {
      showError("Account is inactive. Please contact your administrator.");
      return;
    }

    // Validate password using bcryptjs
    const isPasswordValid = await bcrypt.compare(password, userData.hashedPassword);

    if (!isPasswordValid) {
      showError("Invalid username or password.");
      return;
    }

    // Update last login
    await updateDoc(userDoc.ref, {
      last_login: new Date().toISOString(),
      login_count: (userData.login_count || 0) + 1
    });

    // Store comprehensive session info
    const userSessionData = {
      id: userDoc.id,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      active: userData.active,
      clientSubdomain: subdomain
    };

    sessionStorage.setItem("nexusUser", JSON.stringify(userSessionData));
    sessionStorage.setItem("tenant_id", subdomain);
    sessionStorage.setItem("clientSubdomain", subdomain);
    sessionStorage.setItem("username", userData.username);
    sessionStorage.setItem("role", userData.role);

    // Store client settings for easy access
    if (clientData.settings) {
      sessionStorage.setItem("clientSettings", JSON.stringify(clientData.settings));
    }

    // Store client logo URL if available
    if (clientData.logo_url) {
      sessionStorage.setItem("clientLogoUrl", clientData.logo_url);
    }

    // Store client name
    sessionStorage.setItem("clientName", clientData.name);

    // Log successful login
    await addDoc(collection(db, 'clients', subdomain, 'logs'), {
      action: 'user_login',
      username: userData.username,
      timestamp: new Date().toISOString(),
      ip_address: 'unknown', // Could be enhanced with IP detection
      user_agent: navigator.userAgent
    });

    console.log("User logged in successfully:", userSessionData);
    console.log("Client context set:", subdomain);

    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("Login error:", err);
    showError("Login failed. Please try again.");

    // Log failed login attempt
    try {
      await addDoc(collection(db, 'clients', subdomain, 'logs'), {
        action: 'failed_login_attempt',
        username: username,
        timestamp: new Date().toISOString(),
        error: err.message,
        ip_address: 'unknown',
        user_agent: navigator.userAgent
      });
    } catch (logError) {
      console.error("Failed to log login attempt:", logError);
    }
  }
});

// Helper function to show error messages
function showError(message) {
  const errorDiv = document.getElementById("login-error");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";

  // Hide error after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
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

  try {
    const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subdomain: clientName,
        username,
        newPassword
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
