import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getCurrentClientSubdomain } from './firebase.js';

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

    // Check if password change is required
    if (userData.must_change_password) {
      // Delay to allow session storage to be set
      setTimeout(() => {
        handlePasswordChange();
      }, 100);
    } else {
      window.location.href = "dashboard.html";
    }
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

// Helper function to show success messages
function showSuccess(message) {
  const errorDiv = document.getElementById("login-error");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  errorDiv.style.background = "rgba(16, 185, 129, 0.1)";
  errorDiv.style.borderColor = "var(--nexus-success)";
  errorDiv.style.color = "var(--nexus-success)";

  // Hide success after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = "none";
    errorDiv.style.background = "rgba(239, 68, 68, 0.1)";
    errorDiv.style.borderColor = "var(--nexus-error)";
    errorDiv.style.color = "var(--nexus-error)";
  }, 5000);
}

// Forgot Password functionality
document.getElementById('forgot-password-btn').addEventListener('click', async (e) => {
  e.preventDefault();

  const subdomain = getSubdomain();
  if (!subdomain) {
    showError("Invalid access. Use your client subdomain.");
    return;
  }

  const username = prompt("Enter your username:");
  if (!username) {
    return;
  }

  try {
    // Find user by username in client-specific users collection
    const usersRef = collection(db, 'clients', subdomain, 'users');
    const userQuery = query(usersRef, where('username', '==', username.trim()));
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      showError("Username not found. Contact your administrator for help.");
      return;
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Generate default password (client subdomain)
    const defaultPassword = subdomain;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update user with new password and force password change
    await updateDoc(userDoc.ref, {
      hashedPassword: hashedPassword,
      must_change_password: true,
      password_reset_date: new Date().toISOString(),
      password_reset_by: 'self_service'
    });

    // Log password reset
    await addDoc(collection(db, 'clients', subdomain, 'logs'), {
      action: 'password_reset',
      username: userData.username,
      timestamp: new Date().toISOString(),
      reset_method: 'forgot_password',
      ip_address: 'unknown',
      user_agent: navigator.userAgent
    });

    showSuccess(`Password has been reset to default. Your new password is: "${defaultPassword}". You will be required to change it on next login.`);

  } catch (error) {
    console.error('Password reset error:', error);
    showError("Failed to reset password. Please try again or contact support.");
  }
});

// Password change functionality for users who must change password
async function handlePasswordChange() {
  const currentUser = JSON.parse(sessionStorage.getItem('nexusUser'));
  const subdomain = getCurrentClientSubdomain();

  if (!currentUser || !currentUser.must_change_password) {
    return;
  }

  // Show password change modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="
      background: var(--nexus-card);
      border-radius: var(--radius);
      padding: 2rem;
      width: 90%;
      max-width: 400px;
      border: 1px solid var(--nexus-border);
    ">
      <h3 style="color: var(--nexus-light); margin-bottom: 1rem;">Password Change Required</h3>
      <p style="color: var(--nexus-muted); margin-bottom: 1.5rem;">You must change your password before continuing.</p>

      <form id="password-change-form">
        <div style="margin-bottom: 1rem;">
          <label style="color: var(--nexus-light); font-weight: 600; display: block; margin-bottom: 0.5rem;">New Password</label>
          <input type="password" id="new-password" required style="
            width: 100%;
            padding: 0.75rem;
            background: var(--nexus-dark);
            border: 1px solid var(--nexus-border);
            border-radius: var(--radius-sm);
            color: var(--nexus-light);
          ">
        </div>

        <div style="margin-bottom: 1.5rem;">
          <label style="color: var(--nexus-light); font-weight: 600; display: block; margin-bottom: 0.5rem;">Confirm New Password</label>
          <input type="password" id="confirm-password" required style="
            width: 100%;
            padding: 0.75rem;
            background: var(--nexus-dark);
            border: 1px solid var(--nexus-border);
            border-radius: var(--radius-sm);
            color: var(--nexus-light);
          ">
        </div>

        <button type="submit" style="
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, var(--nexus-yellow), #f59e0b);
          color: var(--nexus-dark);
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
        ">Change Password</button>
      </form>

      <div id="password-change-error" style="
        color: var(--nexus-error);
        margin-top: 1rem;
        display: none;
      "></div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle password change form submission
  document.getElementById('password-change-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('password-change-error');

    if (newPassword !== confirmPassword) {
      errorDiv.textContent = "Passwords do not match.";
      errorDiv.style.display = "block";
      return;
    }

    if (newPassword.length < 6) {
      errorDiv.textContent = "Password must be at least 6 characters long.";
      errorDiv.style.display = "block";
      return;
    }

    try {
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      const userRef = doc(db, 'clients', subdomain, 'users', currentUser.id);
      await updateDoc(userRef, {
        hashedPassword: hashedPassword,
        must_change_password: false,
        password_changed_date: new Date().toISOString()
      });

      // Log password change
      await addDoc(collection(db, 'clients', subdomain, 'logs'), {
        action: 'password_changed',
        username: currentUser.username,
        timestamp: new Date().toISOString(),
        change_method: 'required_change'
      });

      // Update session
      currentUser.must_change_password = false;
      sessionStorage.setItem('nexusUser', JSON.stringify(currentUser));

      // Remove modal
      document.body.removeChild(modal);

      showSuccess("Password changed successfully!");

    } catch (error) {
      console.error('Password change error:', error);
      errorDiv.textContent = "Failed to change password. Please try again.";
      errorDiv.style.display = "block";
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
