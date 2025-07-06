import { db } from './firebase.js';
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Helper to slugify client name for username
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Helper to get current subdomain
function getSubdomain() {
  const tenant_id = sessionStorage.getItem('tenant_id');
  return tenant_id || 'default';
}

// Helper to get current user info for API calls
function getCurrentUser() {
  return {
    username: sessionStorage.getItem('username'),
    role: sessionStorage.getItem('role'),
    subdomain: getSubdomain()
  };
}

window.showManageUsersModal = async function(clientName) {
  // Remove any existing modal
  let modal = document.getElementById('manage-users-modal');
  if (modal) modal.remove();

  const subdomain = getSubdomain();

  // Fetch users directly from Firestore (since backend doesn't have list-users endpoint)
  let users = [];
  try {
    const usersRef = collection(db, 'clients', subdomain, 'users');
    const snapshot = await getDocs(usersRef);
    users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).filter(user => !user.soft_deleted);
  } catch (e) {
    console.error('Error fetching users:', e);
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
                <td>${u.firstName} ${u.lastName}</td>
                <td>${u.role}</td>
                <td>
                  ${u.active ? 
                    `<button type="button" class="deactivate-user explorer-btn danger" data-username="${u.username}">Deactivate</button>` :
                    `<button type="button" class="reactivate-user explorer-btn" data-username="${u.username}">Reactivate</button>`
                  }
                  <button type="button" class="reset-password explorer-btn" data-username="${u.username}">Reset Password</button>
                  ${getCurrentUser().role === 'nexus' ? 
                    `<button type="button" class="delete-user explorer-btn danger" data-username="${u.username}">Delete</button>` : ''
                  }
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
        <input type="text" id="firstName" placeholder="First Name" required>
        <input type="text" id="lastName" placeholder="Last Name" required>
        <input type="password" id="newPassword" placeholder="Password" required>
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

  // Deactivate user
  modal.querySelectorAll('.deactivate-user').forEach(btn => {
    btn.onclick = async function() {
      const targetUsername = btn.getAttribute('data-username');
      if (!confirm(`Deactivate user "${targetUsername}"?`)) return;
      
      const currentUser = getCurrentUser();
      try {
        const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/deactivate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            subdomain: currentUser.subdomain,
            username: currentUser.username,
            targetUsername 
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        modal.remove();
        window.showManageUsersModal(clientName); // Refresh
      } catch (err) {
        alert('Error deactivating user: ' + err.message);
      }
    };
  });

  // Reactivate user
  modal.querySelectorAll('.reactivate-user').forEach(btn => {
    btn.onclick = async function() {
      const targetUsername = btn.getAttribute('data-username');
      if (!confirm(`Reactivate user "${targetUsername}"?`)) return;
      
      const currentUser = getCurrentUser();
      try {
        const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/reactivate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            subdomain: currentUser.subdomain,
            username: currentUser.username,
            targetUsername 
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        modal.remove();
        window.showManageUsersModal(clientName); // Refresh
      } catch (err) {
        alert('Error reactivating user: ' + err.message);
      }
    };
  });

  // Delete user (Nexus only)
  modal.querySelectorAll('.delete-user').forEach(btn => {
    btn.onclick = async function() {
      const targetUsername = btn.getAttribute('data-username');
      if (!confirm(`PERMANENTLY DELETE user "${targetUsername}"? This cannot be undone!`)) return;
      
      const currentUser = getCurrentUser();
      try {
        const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            subdomain: currentUser.subdomain,
            username: currentUser.username,
            targetUsername 
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        modal.remove();
        window.showManageUsersModal(clientName); // Refresh
      } catch (err) {
        alert('Error deleting user: ' + err.message);
      }
    };
  });

  // Reset password
  modal.querySelectorAll('.reset-password').forEach(btn => {
    btn.onclick = async function() {
      const targetUsername = btn.getAttribute('data-username');
      const newPassword = prompt(`Enter new password for "${targetUsername}":`);
      if (!newPassword) return;
      
      const currentUser = getCurrentUser();
      try {
        const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            subdomain: currentUser.subdomain,
            username: targetUsername,
            newPassword 
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        alert(`Password reset successfully for ${targetUsername}`);
        modal.remove();
        window.showManageUsersModal(clientName); // Refresh
      } catch (err) {
        alert('Error resetting password: ' + err.message);
      }
    };
  });

  // Add user
  modal.querySelector('#add-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const firstName = modal.querySelector('#firstName').value.trim();
    const lastName = modal.querySelector('#lastName').value.trim();
    const newPassword = modal.querySelector('#newPassword').value.trim();
    const role = modal.querySelector('#role').value;
    const newUsername = `${firstName[0]}${lastName}`.toLowerCase() + '@' + getSubdomain();

    const currentUser = getCurrentUser();
    try {
      const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: currentUser.subdomain,
          username: currentUser.username,
          newUsername,
          newPassword,
          role
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      alert(`User created successfully!\nUsername: ${newUsername}\nPassword: ${newPassword}`);
      modal.remove();
      window.showManageUsersModal(clientName); // Refresh
    } catch (err) {
      alert('Error creating user: ' + err.message);
    }
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
    
    const currentUser = getCurrentUser();
    let added = 0, failed = 0;
    
    for (const line of lines) {
      const [firstName, lastName, role] = line.split(',').map(s => s.trim());
      if (!firstName || !lastName || !role) { failed++; continue; }
      const newUsername = `${firstName[0]}${lastName}`.toLowerCase() + '@' + currentUser.subdomain;
      const defaultPassword = currentUser.subdomain; // Use subdomain as default password
      
      try {
        const res = await fetch("https://us-central1-nexus-res-q.cloudfunctions.net/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subdomain: currentUser.subdomain,
            username: currentUser.username,
            newUsername,
            newPassword: defaultPassword,
            role
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        added++;
      } catch (e) {
        console.error('Error adding user:', e);
        failed++;
      }
    }
    alert(`Bulk add complete!\nAdded: ${added}\nFailed: ${failed}`);
    modal.remove();
    window.showManageUsersModal(clientName); // Refresh
  };
}

