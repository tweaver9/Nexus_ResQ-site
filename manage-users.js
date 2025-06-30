// manage-users.js (Firebase version)
import { db } from './firebase.js';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

// Get the current tenant_id from sessionStorage
const tenantId = sessionStorage.getItem('tenant_id');
if (!tenantId) {
  window.location.href = "login.html";
}

// Render user cards in a 2-column grid
async function loadUsers() {
  const container = document.getElementById('user-list');
  container.innerHTML = ""; // Clear old content

  // Only fetch users for the current tenant
  const usersCol = collection(db, `clients/${tenantId}/users`);
  const q = query(usersCol);
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    container.innerHTML = "<div class='dashboard-placeholder'>No users found.</div>";
    return;
  }

  let html = "";
  snapshot.forEach(docSnap => {
    const user = docSnap.data();
    html += `
      <div class="user-card">
        <span class="user-name">${user.username} <span style="color:#b2b2b2; font-size:0.92em;">(${user.role})</span></span>
        <span style="display: flex; gap:8px;">
          <button class="edit-icon-btn" onclick="editUser('${docSnap.id}')"
            title="Edit ${user.username}">
            <svg viewBox="0 0 20 20">
              <path d="M14.846 3.146a1.5 1.5 0 0 1 2.121 2.121l-1.586 1.586-2.122-2.12 1.587-1.587zm-2.122 2.12l2.122 2.122L6.76 15.374a2 2 0 0 1-.88.513l-3.27.873.872-3.27a2 2 0 0 1 .513-.88l7.729-7.729z"/>
            </svg>
          </button>
          <button class="edit-icon-btn" onclick="deleteUser('${docSnap.id}', '${user.username}')"
            title="Delete ${user.username}">
            <svg viewBox="0 0 20 20">
              <path d="M6 7V6a4 4 0 0 1 8 0v1h2.25a.75.75 0 1 1 0 1.5h-.278l-.894 8.057A3 3 0 0 1 12.097 19H7.903a3 3 0 0 1-2.981-2.443L4.028 8.5H3.75a.75.75 0 1 1 0-1.5H6Zm1.5-1a2.5 2.5 0 0 1 5 0v1h-5V6ZM5.964 8.5l.872 7.844A1.5 1.5 0 0 0 7.903 17.5h4.194a1.5 1.5 0 0 0 1.495-1.156l.872-7.844H5.964Z"/>
            </svg>
          </button>
        </span>
      </div>
    `;
  });
  container.innerHTML = html;
}

// Add User (now includes tenant_id!)
document.getElementById('add-user-form').onsubmit = async function(e) {
  e.preventDefault();
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value.trim();
  const role = document.getElementById('new-role').value;
  const msgDiv = document.getElementById('add-user-message');
  msgDiv.textContent = '';
  if (!username || !password) {
    msgDiv.textContent = "Username and password required.";
    return;
  }
  try {
    await addDoc(collection(db, `clients/${tenantId}/users`), {
      username,
      password,
      role
    });
    msgDiv.textContent = "User added!";
    document.getElementById('add-user-form').reset();
    loadUsers();
  } catch (error) {
    msgDiv.textContent = "Error adding user.";
  }
};

// Delete User (called from button)
window.deleteUser = async function(userDocId, username) {
  if (!confirm(`Delete user: ${username}?`)) return;
  try {
    await deleteDoc(doc(db, `clients/${tenantId}/users`, userDocId));
  } catch {
    alert('Failed to delete user.');
  }
  loadUsers();
};

// Edit User stub (expand later!)
window.editUser = function(userDocId) {
  alert('Edit user: ' + userDocId + '\n(Feature coming soon!)');
};

// Load user grid on page load
window.addEventListener('DOMContentLoaded', loadUsers);

// Show/Hide Add User modal
document.getElementById('addUserBtn').onclick = function() {
  document.getElementById('addUserModal').style.display = 'flex';
};
document.getElementById('cancelAddUser').onclick = function() {
  document.getElementById('addUserModal').style.display = 'none';
  document.getElementById('add-user-form').reset();
  document.getElementById('add-user-message').textContent = '';
};
