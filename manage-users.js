// manage-users.js - User Management Modal Functionality

// Use the same Firebase instance as the HTML file
let db;

// Wait for Firebase to be available
function ensureFirebase() {
  if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    db = firebase.firestore();
    return true;
  }
  return false;
}

// Try to initialize Firebase connection immediately
if (!ensureFirebase()) {
  // If Firebase isn't ready, wait for it
  console.log('Waiting for Firebase to initialize...');
  const checkFirebase = setInterval(() => {
    if (ensureFirebase()) {
      console.log('Firebase initialized for manage-users.js');
      clearInterval(checkFirebase);
    }
  }, 100);
}

// Helper to slugify client name for username
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Custom notification function that matches the theme
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.nexus-notification');
  existingNotifications.forEach(notif => notif.remove());

  const notification = document.createElement('div');
  notification.className = 'nexus-notification';
  notification.innerHTML = `
    <div class="nexus-notification-content ${type}">
      <div class="nexus-notification-text">${message.replace(/\n/g, '<br>')}</div>
      <button class="nexus-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000;
    max-width: 500px;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  // Auto-remove after 8 seconds for success messages, 12 seconds for others
  const autoRemoveTime = type === 'success' ? 8000 : 12000;
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }
  }, autoRemoveTime);
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
  try {
    // Ensure Firebase is available
    if (!ensureFirebase()) {
      throw new Error('Firebase not initialized');
    }

    // Remove any existing modals to prevent conflicts
    const existingModals = document.querySelectorAll('.manage-users-modal-bg');
    existingModals.forEach(modal => modal.remove());

    const subdomain = getSubdomain();

    // Fetch users directly from Firestore using the flat users collection
    let users = [];
    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('clientId', '==', subdomain).get();
      users = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => !user.soft_deleted);
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
      <div class="form-section-header">
        <div class="manage-users-section-title">Add New User</div>
        <button type="button" id="bulk-add-users-btn" class="explorer-btn">Bulk Add</button>
      </div>
      <form id="add-user-form">
        <input type="text" id="firstName" placeholder="First Name" required>
        <input type="text" id="lastName" placeholder="Last Name" required>
        <input type="password" id="newPassword" placeholder="Password (leave blank for default)" value="">
        <div class="form-hint">
          Default password will be the client name (${getSubdomain()}) if left blank
        </div>
        <select id="role" required>
          <option value="">Select Role</option>
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
          <option value="nexus">Nexus</option>
        </select>
        <div class="form-actions">
          <button type="button" id="cancel-manage-users" class="explorer-btn danger">Cancel</button>
          <button type="submit" class="explorer-btn">Add User</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Click outside to close modal
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Remove modal on cancel
  modal.querySelector('#cancel-manage-users').onclick = () => modal.remove();

  // Deactivate user
  modal.querySelectorAll('.deactivate-user').forEach(btn => {
    btn.onclick = async function() {
      const targetUsername = btn.getAttribute('data-username');
      if (!confirm(`Deactivate user "${targetUsername}"?`)) return;
      
      const currentUser = getCurrentUser();
      try {
        const res = await fetch("https://api-boh2auh7ta-uc.a.run.app/deactivate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            clientId: currentUser.subdomain,
            username: targetUsername 
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        // Close modal and refresh the main page instead of reopening modal
        modal.remove();
        location.reload(); // This will refresh the main page
      } catch (err) {
        showNotification('Error deactivating user: ' + err.message, 'error');
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
        const res = await fetch("https://api-boh2auh7ta-uc.a.run.app/reactivate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            clientId: currentUser.subdomain,
            username: targetUsername 
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        // Close modal and refresh the main page instead of reopening modal
        modal.remove();
        location.reload(); // This will refresh the main page
      } catch (err) {
        showNotification('Error reactivating user: ' + err.message, 'error');
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
        const res = await fetch("https://api-boh2auh7ta-uc.a.run.app/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            clientId: currentUser.subdomain,
            username: targetUsername 
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        // Close modal and refresh the main page instead of reopening modal
        modal.remove();
        location.reload(); // This will refresh the main page
      } catch (err) {
        showNotification('Error deleting user: ' + err.message, 'error');
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
        const res = await fetch("https://api-boh2auh7ta-uc.a.run.app/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            subdomain: currentUser.subdomain,
            username: targetUsername,
            newPassword 
          })
        });
        
        if (!res.ok) throw new Error(await res.text());
        
        showNotification(`Password reset successfully for ${targetUsername}`, 'success');
        // Close modal and refresh the main page instead of reopening modal
        modal.remove();
        location.reload(); // This will refresh the main page
      } catch (err) {
        showNotification('Error resetting password: ' + err.message, 'error');
      }
    };
  });

  // Add user
  modal.querySelector('#add-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = modal.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding User...';
    
    try {
      const firstName = modal.querySelector('#firstName').value.trim();
      const lastName = modal.querySelector('#lastName').value.trim();
      let newPassword = modal.querySelector('#newPassword').value.trim();
      const role = modal.querySelector('#role').value;
      
      // Validate required fields
      if (!firstName || !lastName || !role) {
        showNotification('Please fill in all required fields', 'warning');
        return;
      }
      
      // Validate role is one of the allowed values
      const validRoles = ['user', 'manager', 'admin', 'nexus'];
      if (!validRoles.includes(role)) {
        showNotification('Invalid role selected', 'warning');
        return;
      }
      
      // Generate username in correct format: FirstInitialLastName@clientName (no dots/spaces)
      const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, '');
      const cleanLastName = lastName.replace(/[^a-zA-Z]/g, '');
      const newUsername = `${cleanFirstName[0]}${cleanLastName}`.toLowerCase() + '@' + getSubdomain();
      
      // Use client name as default password (not slugified)
      if (!newPassword) {
        newPassword = getSubdomain(); // Use actual client name as password
      }

      const currentUser = getCurrentUser();
      const res = await fetch("https://api-boh2auh7ta-uc.a.run.app/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          firstName,
          lastName,
          role: role, // Role is already lowercase from validation
          clientId: currentUser.subdomain
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      // Show detailed success notification
      const successMessage = `✅ User Created Successfully!\n\n` +
        `👤 Name: ${firstName} ${lastName}\n` +
        `📧 Username: ${newUsername}\n` +
        `🔑 Default Password: ${newPassword}\n\n` +
        `⚠️ Important: User should change password on first login`;
      
      showNotification(successMessage, 'success');
      // Close modal and refresh the main page instead of reopening modal
      modal.remove();
      location.reload(); // This will refresh the main page
    } catch (err) {
      showNotification('Error creating user: ' + err.message, 'error');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  };

  // --- BULK ADD USERS ---
  modal.querySelector('#bulk-add-users-btn').onclick = () => {
    showBulkAddUsersModal(clientName);
  };
  } catch (error) {
    console.error('Error in showManageUsersModal:', error);
    if (typeof showNotification === 'function') {
      showNotification(`Error loading user management: ${error.message}`, 'error');
    } else {
      alert(`Error loading user management: ${error.message}`);
    }
  }
}

// Bulk Add Users Modal
function showBulkAddUsersModal(clientName) {
  try {
    // Ensure Firebase is available
    if (!ensureFirebase()) {
      throw new Error('Firebase not initialized');
    }

    // Remove any existing modals to prevent conflicts
    const existingModals = document.querySelectorAll('.manage-users-modal-bg');
    existingModals.forEach(modal => modal.remove());

  const templateUrl = "https://firebasestorage.googleapis.com/v0/b/nexus-res-q.appspot.com/o/Bulk%20Add%20Template%2FBulk%20User%20Add%20CSV%20Template.csv?alt=media";

  const modal = document.createElement('div');
  modal.id = 'bulk-add-users-modal';
  modal.className = 'manage-users-modal-bg';
  modal.innerHTML = `
    <div class="manage-users-modal-content">
      <div class="manage-users-modal-title">Bulk Add Users</div>
      <div class="bulk-instructions">
        <a href="${templateUrl}" download>Download CSV Template</a>
        <br>
        📋 Paste CSV rows below (First Name,Last Name,Role):<br>
        📧 Username format: FirstInitialLastName@${getSubdomain()}<br>
        <div class="bulk-instructions-detail">Valid roles: user, manager, admin. All users will start with the default password (${getSubdomain()}).</div>
      </div>
        <textarea id="bulk-users-textarea"></textarea>
        <div class="file-upload-section">
          <label class="file-upload-label">
            Or upload CSV file:
            <input type="file" id="bulk-users-file" accept=".csv" class="file-upload-input">
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button id="bulk-add-cancel" class="explorer-btn danger">Cancel</button>
        <button id="bulk-add-save" class="explorer-btn">Add Users</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Click outside to close modal
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.remove();
    }
  });

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
    const saveBtn = modal.querySelector('#bulk-add-save');
    const originalText = saveBtn.textContent;
    
    // Show loading state
    saveBtn.disabled = true;
    saveBtn.textContent = 'Processing...';
    
    try {
      const textarea = modal.querySelector('#bulk-users-textarea');
      const lines = textarea.value.trim().split('\n').filter(Boolean);
      if (!lines.length) {
        showNotification('Please enter some users to add', 'warning');
        return;
      }
      
      const currentUser = getCurrentUser();
      
      // Show preview confirmation before processing
      const previewMessage = `📋 Bulk Add Preview\n\n` +
        `📊 Users to add: ${lines.length}\n` +
        `📧 Username format: FirstInitialLastName@${currentUser.subdomain}\n` +
        `🔑 Default password: ${currentUser.subdomain}\n\n` +
        `⚠️ All users will need to change their password on first login.\n\n` +
        `Continue with bulk user creation?`;
      
      if (!confirm(previewMessage)) {
        return;
      }
      
      let added = 0, failed = 0;
      const addedUsers = [];
      const failedUsers = [];
      
      for (const line of lines) {
        const [firstName, lastName, role] = line.split(',').map(s => s.trim());
        if (!firstName || !lastName || !role) { 
          failed++; 
          failedUsers.push(`${firstName || '?'} ${lastName || '?'} - Missing required fields`);
          continue; 
        }
        
        // Validate role
        const validRoles = ['user', 'manager', 'admin', 'nexus'];
        if (!validRoles.includes(role.toLowerCase())) { 
          console.error(`Invalid role "${role}" for user ${firstName} ${lastName}`);
          failed++; 
          failedUsers.push(`${firstName} ${lastName} - Invalid role: ${role}`);
          continue; 
        }
        
        // Generate username in correct format: FirstInitialLastName@clientName (no dots/spaces)
        const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, '');
        const cleanLastName = lastName.replace(/[^a-zA-Z]/g, '');
        const newUsername = `${cleanFirstName[0]}${cleanLastName}`.toLowerCase() + '@' + currentUser.subdomain;
        const defaultPassword = currentUser.subdomain; // Use actual client name as password
        
        try {
          const res = await fetch("https://api-boh2auh7ta-uc.a.run.app/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: newUsername,
              password: defaultPassword,
              firstName,
              lastName,
              role: role.toLowerCase(), // Ensure role is lowercase
              clientId: currentUser.subdomain
            })
          });
          
          if (!res.ok) throw new Error(await res.text());
          added++;
          addedUsers.push(`${firstName} ${lastName} (${newUsername})`);
        } catch (e) {
          console.error('Error adding user:', e);
          failed++;
          failedUsers.push(`${firstName} ${lastName} - ${e.message}`);
        }
      }
      // Show detailed results
      let resultMessage = `📊 Bulk Add Results\n\n`;
      resultMessage += `✅ Successfully Added: ${added}\n`;
      if (failed > 0) {
        resultMessage += `❌ Failed: ${failed}\n\n`;
      }
      
      if (addedUsers.length > 0) {
        resultMessage += `👥 Added Users:\n`;
        addedUsers.forEach(user => {
          resultMessage += `• ${user}\n`;
        });
        resultMessage += `\n🔑 Default Password: ${currentUser.subdomain}\n`;
        resultMessage += `⚠️ All users should change password on first login\n`;
      }
      
      if (failedUsers.length > 0) {
        resultMessage += `\n❌ Failed Users:\n`;
        failedUsers.forEach(error => {
          resultMessage += `• ${error}\n`;
        });
      }
      
      showNotification(resultMessage, added > 0 ? 'success' : 'warning');
      // Close modal and refresh the main page instead of reopening modal
      modal.remove();
      location.reload(); // This will refresh the main page
    } catch (err) {
      showNotification('Error processing bulk add: ' + err.message, 'error');
    } finally {
      // Reset button state
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  };
  } catch (error) {
    console.error('Error in showBulkAddUsersModal:', error);
    if (typeof showNotification === 'function') {
      showNotification(`Error loading bulk add: ${error.message}`, 'error');
    } else {
      alert(`Error loading bulk add: ${error.message}`);
    }
  }
}

// Wrapper function for easier access
window.showBulkAddModal = function(clientName) {
  showBulkAddUsersModal(clientName);
};

// Test that functions are properly exposed
console.log('✅ manage-users.js loaded. Functions available:', {
  showManageUsersModal: typeof window.showManageUsersModal,
  showBulkAddModal: typeof window.showBulkAddModal,
  firebase: typeof firebase,
  firebaseApps: typeof firebase !== 'undefined' ? firebase.apps.length : 0
});
