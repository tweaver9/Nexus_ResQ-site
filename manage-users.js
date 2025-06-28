<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Get the current tenant_id from sessionStorage
const tenantId = sessionStorage.getItem('tenant_id');
if (!tenantId) {
  // If no tenant_id, kick to login page
  window.location.href = "login.html";
}

// Render user cards in a 2-column grid
async function loadUsers() {
  const container = document.getElementById('user-list');
  container.innerHTML = ""; // Clear old content

  // Only fetch users for the current tenant
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId);

  console.log("Supabase returned:", { data, error });

  if (error || !data || data.length === 0) {
    container.innerHTML = "<div class='dashboard-placeholder'>No users found.</div>";
    return;
  }

  let html = "";
  for (let i = 0; i < data.length; i++) {
    const user = data[i];
    html += `
      <div class="user-card">
        <span class="user-name">${user.username} <span style="color:#b2b2b2; font-size:0.92em;">(${user.role})</span></span>
        <span style="display: flex; gap:8px;">
          <button class="edit-icon-btn" onclick="editUser('${user.username}')"
            title="Edit ${user.username}">
            <svg viewBox="0 0 20 20">
              <path d="M14.846 3.146a1.5 1.5 0 0 1 2.121 2.121l-1.586 1.586-2.122-2.12 1.587-1.587zm-2.122 2.12l2.122 2.122L6.76 15.374a2 2 0 0 1-.88.513l-3.27.873.872-3.27a2 2 0 0 1 .513-.88l7.729-7.729z"/>
            </svg>
          </button>
          <button class="edit-icon-btn" onclick="deleteUser('${user.username}')"
            title="Delete ${user.username}">
            <svg viewBox="0 0 20 20">
              <path d="M6 7V6a4 4 0 0 1 8 0v1h2.25a.75.75 0 1 1 0 1.5h-.278l-.894 8.057A3 3 0 0 1 12.097 19H7.903a3 3 0 0 1-2.981-2.443L4.028 8.5H3.75a.75.75 0 1 1 0-1.5H6Zm1.5-1a2.5 2.5 0 0 1 5 0v1h-5V6ZM5.964 8.5l.872 7.844A1.5 1.5 0 0 0 7.903 17.5h4.194a1.5 1.5 0 0 0 1.495-1.156l.872-7.844H5.964Z"/>
            </svg>
          </button>
        </span>
      </div>
    `;
  }
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
  const { error } = await supabase.from('users').insert([{ username, password, role, tenant_id: tenantId }]);
  if (error) {
    msgDiv.textContent = "Error adding user.";
  } else {
    msgDiv.textContent = "User added!";
    document.getElementById('add-user-form').reset();
    loadUsers();
  }
};

// Delete User (called from button)
window.deleteUser = async function(username) {
  if (!confirm(`Delete user: ${username}?`)) return;
  // Only delete the user for this tenant
  const { error } = await supabase.from('users')
    .delete()
    .eq('username', username)
    .eq('tenant_id', tenantId);
  if (error) alert('Failed to delete user.');
  loadUsers();
}

// Edit User stub (expand later!)
window.editUser = function(username) {
  alert('Edit user: ' + username + '\n(Feature coming soon!)');
}

// Load user grid on page load
window.addEventListener('DOMContentLoaded', loadUsers);
</script>
