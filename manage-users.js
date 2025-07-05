import { db } from './firebase.js';
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Helper to slugify client name for username
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Helper to generate a random reset code
function generateResetCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

window.showManageUsersModal = async function(clientName) {
  // Remove any existing modal
  let modal = document.getElementById('manage-users-modal');
  if (modal) modal.remove();

  // Fetch users from backend API
  let users = [];
  try {
    const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/list-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName })
    });
    users = await res.json();
  } catch (e) {
    users = [];
  }

  // Modal HTML
  modal = document.createElement('div');
  modal.id = 'manage-users-modal';
  modal.className = 'manage-users-modal-bg';
  modal.innerHTML = `
    <div class="manage-users-modal-content">
      <div class="manage-users-modal-title">Manage Users</div>
      <div>
        <div class="manage-users-section-title">Existing Users</div>
        <table class="manage-users-table" id="existing-users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr data-username="${u.username}">
                <td>${u.username}</td>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.role}</td>
                <td>
                  <button type="button" class="remove-user explorer-btn danger" data-username="${u.username}">Remove</button>
                  <button type="button" class="reset-password explorer-btn" data-username="${u.username}">Reset Password</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="manage-users-section-title">Add New User</div>
        <button type="button" id="bulk-add-users-btn" class="explorer-btn">Bulk Add</button>
      </div>
      <form id="add-user-form">
        <input type="text" id="first_name" placeholder="First Name" required>
        <input type="text" id="last_name" placeholder="Last Name" required>
        <input type="password" id="password" placeholder="Password" required>
        <select id="role" required>
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <div style="text-align:right;">
          <button type="button" id="cancel-manage-users" class="explorer-btn danger">Cancel</button>
          <button type="submit" class="explorer-btn">Add User</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Remove modal on cancel
  modal.querySelector('#cancel-manage-users').onclick = () => modal.remove();

  // Remove user
  modal.querySelectorAll('.remove-user').forEach(btn => {
    btn.onclick = async function() {
      const username = btn.getAttribute('data-username');
      if (!confirm(`Remove user "${username}"?`)) return;
      await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/remove-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, username })
      });
      modal.remove();
      window.showManageUsersModal(clientName); // Refresh
    };
  });

  // Reset password
  modal.querySelectorAll('.reset-password').forEach(btn => {
    btn.onclick = async function() {
      const username = btn.getAttribute('data-username');
      if (!confirm(`Generate a password reset code for "${username}"?`)) return;
      const resetCode = generateResetCode();
      await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/reset-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, username, resetCode })
      });
      alert(`Password reset code for ${username}: ${resetCode}\n\nSend this code to the user. They will be prompted to enter it and set a new password on next login.`);
      modal.remove();
      window.showManageUsersModal(clientName); // Refresh
    };
  });

  // Add user
  modal.querySelector('#add-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const first_name = modal.querySelector('#first_name').value.trim();
    const last_name = modal.querySelector('#last_name').value.trim();
    const password = modal.querySelector('#password').value.trim();
    const role = modal.querySelector('#role').value;
    const username = `${first_name[0]}${last_name}`.toLowerCase() + '@' + slugify(clientName);

    await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/add-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        first_name,
        last_name,
        password,
        role,
        username
      })
    });
    modal.remove();
    window.showManageUsersModal(clientName); // Refresh
  };

  // --- BULK ADD USERS ---
  modal.querySelector('#bulk-add-users-btn').onclick = () => {
    showBulkAddUsersModal(clientName);
  };
}

// Bulk Add Users Modal
function showBulkAddUsersModal(clientName) {
  let modal = document.getElementById('bulk-add-users-modal');
  if (modal) modal.remove();

  const templateUrl = "https://firebasestorage.googleapis.com/v0/b/nexus-res-q.appspot.com/o/Bulk%20Add%20Template%2FBulk%20User%20Add%20CSV%20Template.csv?alt=media";

  modal = document.createElement('div');
  modal.id = 'bulk-add-users-modal';
  modal.className = 'manage-users-modal-bg';
  modal.innerHTML = `
    <div class="manage-users-modal-content">
      <div class="manage-users-modal-title">Bulk Add Users</div>
      <div style="margin-bottom:10px;">
        <div style="font-size:0.98em;color:#fdd835;margin-bottom:6px;">
          <a href="${templateUrl}" download style="color:#fdd835;text-decoration:underline;">Download CSV Template</a>
          <br>
          Paste CSV rows below (First Name,Last Name,Role):<br>
          <span style="font-size:0.93em;color:#ffe066;">All users will start with the default password for this client.</span>
        </div>
        <textarea id="bulk-users-textarea" style="width:100%;height:120px;"></textarea>
        <div style="margin:8px 0 0 0;">
          <label style="color:#fdd835;cursor:pointer;">
            Or upload CSV file:
            <input type="file" id="bulk-users-file" accept=".csv" style="display:inline-block;margin-left:8px;">
          </label>
        </div>
      </div>
      <div style="text-align:right;">
        <button id="bulk-add-cancel" class="explorer-btn danger">Cancel</button>
        <button id="bulk-add-save" class="explorer-btn">Add Users</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#bulk-add-cancel').onclick = () => modal.remove();

  // File upload handler
  modal.querySelector('#bulk-users-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      let text = evt.target.result;
      // Remove header if present
      text = text.replace(/^First Name,Last Name,Role\s*\n?/i, '');
      modal.querySelector('#bulk-users-textarea').value = text.trim();
    };
    reader.readAsText(file);
  });

  modal.querySelector('#bulk-add-save').onclick = async () => {
    const textarea = modal.querySelector('#bulk-users-textarea');
    const lines = textarea.value.trim().split('\n').filter(Boolean);
    if (!lines.length) return;
    let added = 0, failed = 0;
    for (const line of lines) {
      const [first_name, last_name, role] = line.split(',').map(s => s.trim());
      if (!first_name || !last_name || !role) { failed++; continue; }
      const username = `${first_name[0]}${last_name}`.toLowerCase() + '@' + slugify(clientName);
      try {
        await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/add-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName,
            first_name,
            last_name,
            password: '', // Backend should assign default password
            role,
            username
          })
        });
        added++;
      } catch (e) {
        failed++;
      }
    }
    alert(`Bulk add complete!\nAdded: ${added}\nFailed: ${failed}`);
    modal.remove();
    window.showManageUsersModal(clientName); // Refresh
  };
}

