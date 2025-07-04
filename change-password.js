import { db } from './firebase.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('changePasswordForm');
  const msgDiv = document.getElementById('changePasswordMsg');
  const username = sessionStorage.getItem('username');
  const tenantId = sessionStorage.getItem('tenant_id');
  const userDocId = sessionStorage.getItem('userDocId'); // Make sure this is set in login.js!

  if (!tenantId || !username || !userDocId) {
    msgDiv.textContent = "Session expired. Please log in again.";
    form.style.display = "none";
    return;
  }

  form.onsubmit = async function(e) {
    e.preventDefault();
    msgDiv.textContent = "";

    const newPass = document.getElementById('newPassword').value.trim();
    const confirm = document.getElementById('confirmPassword').value.trim();
    if (newPass.length < 6) {
      msgDiv.textContent = "Password must be at least 6 characters.";
      return;
    }
    if (newPass !== confirm) {
      msgDiv.textContent = "Passwords do not match.";
      return;
    }

    try {
      // Update password and disable must_change_password
      const userRef = doc(db, `clients/${tenantId}/users`, userDocId);
      await updateDoc(userRef, {
        password: newPass,
        must_change_password: false // <-- Use snake_case as in Firestore
      });
      msgDiv.style.color = "#28e640";
      msgDiv.textContent = "Password changed! Redirecting...";
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);
    } catch (err) {
      msgDiv.style.color = "#ff5050";
      msgDiv.textContent = "Update failed. Please try again.";
    }
  };
});
