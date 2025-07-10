// manage-users.js - User Management Modal Functionality

// Use the same Firebase instance as the HTML file (db is declared in HTML)
// No need to declare db here as it's already declared in the HTML file

// Wait for Firebase and db to be available
function ensureFirebase() {
  if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && typeof db !== 'undefined') {
    return true;
  }
  return false;
}

// Try to check Firebase connection immediately
if (!ensureFirebase()) {
  // If Firebase isn't ready, wait for it
  console.log('Waiting for Firebase and db to be available...');
  const checkFirebase = setInterval(() => {
    if (ensureFirebase()) {
      console.log('Firebase and db are now available for manage-users.js');
      clearInterval(checkFirebase);
      // Expose functions to global scope once Firebase is ready
      exposeGlobalFunctions();
    }
  }, 100);
} else {
  // Firebase is ready, expose functions immediately
  exposeGlobalFunctions();
}

// Helper to slugify client name for username
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Function to expose all modal functions to global scope
function exposeGlobalFunctions() {
  console.log('🔧 Exposing global functions...');
  
  // Expose the main functions to window object
  window.showManageUsersModal = showManageUsersModal;
  window.showBulkAddModal = showBulkAddUsersModal;
  
  console.log('✅ Global functions exposed:', {
    showManageUsersModal: typeof window.showManageUsersModal,
    showBulkAddModal: typeof window.showBulkAddModal
  });
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

async function showManageUsersModal(clientName) {
  try {
    // Ensure Firebase is available
    if (!ensureFirebase()) {
      throw new Error('Firebase not initialized');
    }

    // Remove any existing modals to prevent conflicts
    const existingModals = document.querySelectorAll('.manage-users-modal-bg');
    existingModals.forEach(modal => modal.remove());

    const subdomain = getSubdomain();

    // Simple Add User Modal - no need to fetch existing users
    const modal = document.createElement('div');
    modal.id = 'add-user-modal';
    modal.className = 'manage-users-modal-bg';
    modal.innerHTML = `
      <div class="manage-users-modal-content">
        <div class="manage-users-modal-title">Add New User</div>
        <form id="add-user-form">
          <input type="text" id="firstName" placeholder="First Name" required>
          <input type="text" id="lastName" placeholder="Last Name" required>
          <div class="form-hint">
            Default password will be: ${subdomain}
          </div>
          <select id="role" required>
            <option value="">Select Role</option>
            <option value="user">User - Basic access to view and create inspections</option>
            <option value="manager">Manager - Can manage assets and users, create reports</option>
            <option value="admin">Admin - Full access to all client features and settings</option>
          </select>
          <div class="form-hint role-hint">
            <strong>Role Permissions:</strong><br>
            • <strong>User:</strong> View assets, create inspections, basic reporting<br>
            • <strong>Manager:</strong> All User permissions + manage assets, locations, and users<br>
            • <strong>Admin:</strong> All Manager permissions + client settings, billing, and full control
          </div>
          <div class="form-actions">
            <button type="button" id="cancel-add-user" class="explorer-btn danger">Cancel</button>
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

    // Cancel button
    document.getElementById('cancel-add-user').addEventListener('click', function() {
      modal.remove();
    });

    // Add user form submission
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
        const role = modal.querySelector('#role').value;
        
        // Validate required fields
        if (!firstName || !lastName || !role) {
          showNotification('Please fill in all required fields', 'warning');
          return;
        }
        
        // Validate role is one of the allowed values (lowercase for consistency)
        const validRoles = ['user', 'manager', 'admin'];
        if (!validRoles.includes(role)) {
          showNotification('Invalid role selected. Only user, manager, and admin roles are allowed for client users.', 'warning');
          return;
        }

        // Check if current user has permission to add users
        const currentUserRole = sessionStorage.getItem('role');
        if (!currentUserRole || !['admin', 'manager'].includes(currentUserRole.toLowerCase())) {
          showNotification('You do not have permission to add users. Only admins and managers can add users.', 'error');
          return;
        }
        
        // Generate username in correct format: FirstInitialLastName (no @ symbol for new system)
        const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, '');
        const cleanLastName = lastName.replace(/[^a-zA-Z]/g, '');
        const username = `${cleanFirstName.charAt(0)}${cleanLastName}`.toLowerCase();

        // Default password is the subdomain
        const defaultPassword = subdomain;

        // Import bcryptjs for password hashing (dynamic import to avoid crypto issues)
        const bcrypt = await import('https://cdn.skypack.dev/bcryptjs@2.4.3');
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Check if username already exists
        const usersRef = window.firestoreCompat.collection('clients').doc(subdomain).collection('users');
        const existingUserQuery = await usersRef.where('username', '==', username).get();

        if (!existingUserQuery.empty) {
          showNotification(`Username "${username}" already exists. Please try a different name combination.`, 'warning');
          return;
        }

        // Create user object with proper structure for new Firebase system
        const userData = {
          firstName: firstName,
          lastName: lastName,
          username: username,
          role: role,
          hashedPassword: hashedPassword,
          active: true,
          must_change_password: false,
          created: new Date().toISOString(),
          createdBy: sessionStorage.getItem('username') || 'system',
          login_count: 0,
          last_login: null
        };

        // Add user to client-specific users collection
        await usersRef.add(userData);
        
        if (!res.ok) throw new Error(await res.text());
        
        // Log user creation
        await window.firestoreCompat.collection('clients').doc(subdomain).collection('logs').add({
          action: 'user_created',
          username: username,
          createdBy: sessionStorage.getItem('username') || 'system',
          timestamp: new Date().toISOString(),
          userRole: role,
          firstName: firstName,
          lastName: lastName
        });

        // Show detailed success notification
        const successMessage = `✅ User Created Successfully!\n\n` +
          `👤 Name: ${firstName} ${lastName}\n` +
          `📧 Username: ${username}\n` +
          `🔑 Default Password: ${defaultPassword}\n\n` +
          `⚠️ Important: User should change password on first login`;
        
        showNotification(successMessage, 'success');
        // Close modal and refresh the main page
        modal.remove();
        location.reload();
      } catch (err) {
        showNotification('Error creating user: ' + err.message, 'error');
      } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    };

  } catch (error) {
    console.error('Error in showManageUsersModal:', error);
    if (typeof showNotification === 'function') {
      showNotification(`Error loading user creation form: ${error.message}`, 'error');
    } else {
      alert(`Error loading user creation form: ${error.message}`);
    }
  }
}

// Admin Password Reset Function
async function resetUserPassword(userId, username) {
  const currentUserRole = sessionStorage.getItem('role');
  const subdomain = getSubdomain();

  if (!currentUserRole || !['admin', 'manager'].includes(currentUserRole.toLowerCase())) {
    showNotification('You do not have permission to reset passwords. Only admins and managers can reset passwords.', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to reset the password for user "${username}"?`)) {
    return;
  }

  try {
    // Import bcryptjs for password hashing (dynamic import)
    const bcrypt = await import('https://cdn.skypack.dev/bcryptjs@2.4.3');

    // Default password is the subdomain
    const defaultPassword = subdomain;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update user password
    await window.firestoreCompat.collection('clients').doc(subdomain).collection('users').doc(userId).update({
      hashedPassword: hashedPassword,
      must_change_password: true,
      password_reset_date: new Date().toISOString(),
      password_reset_by: sessionStorage.getItem('username') || 'admin'
    });

    // Log password reset
    await window.firestoreCompat.collection('clients').doc(subdomain).collection('logs').add({
      action: 'admin_password_reset',
      target_username: username,
      reset_by: sessionStorage.getItem('username') || 'admin',
      timestamp: new Date().toISOString(),
      ip_address: 'unknown',
      user_agent: navigator.userAgent
    });

    showNotification(`Password reset successfully for user "${username}". New password: "${defaultPassword}". User will be required to change password on next login.`, 'success');

  } catch (error) {
    console.error('Password reset error:', error);
    showNotification(`Failed to reset password for user "${username}": ${error.message}`, 'error');
  }
}

// Make password reset function globally available
window.resetUserPassword = resetUserPassword;

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
        const validRoles = ['User', 'Manager', 'Admin', 'Nexus'];
        if (!validRoles.includes(role)) { 
          console.error(`Invalid role "${role}" for user ${firstName} ${lastName}`);
          failed++; 
          failedUsers.push(`${firstName} ${lastName} - Invalid role: ${role} (must be: User, Manager, Admin, or Nexus)`);
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
              role: role, // Keep role as-is from CSV (should be capitalized)
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

// Initial function exposure check - will be done again after Firebase is ready
console.log('📄 manage-users.js loaded, waiting for Firebase...');
