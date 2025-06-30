// manage-users.js
import { db } from './firebase.js';
import {
  collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, where
} from "firebase/firestore";

// ========== STATE ==========
let users = [];
let areas = [];
let departments = [];
let selectedUser = null;
let inspections = [];

// ========== DOM ==========
const userList = document.getElementById('userList');
const noUsersMsg = document.getElementById('noUsersMsg');
const userSearch = document.getElementById('userSearch');
const filterRole = document.getElementById('filterRole');
const filterArea = document.getElementById('filterArea');
const filterDept = document.getElementById('filterDept');
const modalRoot = document.getElementById('modal-root');
const addUserBtn = document.getElementById('addUserBtn');

// ========== HELPERS ==========
function getTenantId() { return sessionStorage.getItem('tenant_id'); }

// ========== LOAD DATA ==========
window.addEventListener('DOMContentLoaded', async () => {
  if (!getTenantId()) { window.location.href = "login.html"; return; }
  await Promise.all([
    loadAreas(),
    loadDepartments(),
    loadUsers()
  ]);
  userSearch.addEventListener('input', renderUsers);
  filterRole.addEventListener('change', renderUsers);
  filterArea.addEventListener('change', renderUsers);
  filterDept.addEventListener('change', renderUsers);
  addUserBtn.onclick = showAddUserModal;
});

async function loadAreas() {
  const snap = await getDocs(collection(db, `clients/${getTenantId()}/locations`));
  areas = []; snap.forEach(doc => areas.push({ id: doc.id, ...doc.data() }));
  filterArea.innerHTML = '<option value="all">All Areas</option>' +
    areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
}

async function loadDepartments() {
  const snap = await getDocs(collection(db, `clients/${getTenantId()}/departments`));
  departments = []; snap.forEach(doc => departments.push({ id: doc.id, ...doc.data() }));
  filterDept.innerHTML = '<option value="all">All Departments</option>' +
    departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
}

// ----- Load Users -----
async function loadUsers() {
  const snap = await getDocs(collection(db, `clients/${getTenantId()}/users`));
  users = []; let roles = new Set();
  snap.forEach(doc => { users.push({ id: doc.id, ...doc.data() }); roles.add(doc.data().role); });
  filterRole.innerHTML = '<option value="all">All Roles</option>' +
    Array.from(roles).map(r => `<option value="${r}">${r}</option>`).join('');
  renderUsers();
}

// ========== RENDER USERS ==========
function renderUsers() {
  const searchVal = userSearch.value.trim().toLowerCase();
  const roleVal = filterRole.value;
  const areaVal = filterArea.value;
  const deptVal = filterDept.value;
  let filtered = users.filter(u =>
    (roleVal === "all" || u.role === roleVal) &&
    (areaVal === "all" || (u.area || '') === areaVal) &&
    (deptVal === "all" || (u.department || '') === deptVal) &&
    (
      (u.username || '').toLowerCase().includes(searchVal) ||
      (u.area || '').toLowerCase().includes(searchVal) ||
      (u.department || '').toLowerCase().includes(searchVal)
    )
  );
  userList.innerHTML = "";
  if (!filtered.length) { noUsersMsg.style.display = ""; return; }
  noUsersMsg.style.display = "none";
  filtered.forEach(u => {
    userList.insertAdjacentHTML('beforeend', `
      <div class="user-card" onclick="window.showUserInspections('${u.id}')" style="cursor:pointer;">
        <div class="user-header">
          <span><b>${u.username}</b> <span class="user-role">(${u.role})</span></span>
          <span>
            <button class="users-action-btn" onclick="event.stopPropagation();window.editUser('${u.id}');">Edit</button>
            <button class="users-action-btn" onclick="event.stopPropagation();window.removeUser('${u.id}');">Delete</button>
            <button class="users-action-btn" onclick="event.stopPropagation();window.resetUserPassword('${u.id}');">Reset PW</button>
          </span>
        </div>
        <div class="user-meta">Area: ${u.area || "—"} | Dept: ${u.department || "—"} | Reports to: ${u.reports_to || "—"}</div>
      </div>
    `);
  });
}

// ========== ADD USER MODAL ==========
function showAddUserModal() {
  let areaOptions = areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
  let deptOptions = departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
  modalRoot.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:420px;margin:60px auto;">
      <h3 style="color:#fdd835;">Add User</h3>
      <form id="addUserForm">
        <label>Username</label>
        <input type="text" id="newUsername" required>
        <label>Password</label>
        <input type="password" id="newPassword" required>
        <label>Role</label>
        <input type="text" id="newRole" required placeholder="e.g. user, admin, captain">
        <label>Area</label>
        <select id="newArea"><option value="">Unassigned</option>${areaOptions}</select>
        <label>Department</label>
        <select id="newDept"><option value="">Unassigned</option>${deptOptions}</select>
        <label>Reports to</label>
        <input type="text" id="newReportsTo" placeholder="Optional">
        <button class="users-action-btn" type="submit">Add</button>
        <button class="users-action-btn" type="button" id="closeAddUserModal">Cancel</button>
        <span id="addUserMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  modalRoot.style.display = "flex";
  document.getElementById('closeAddUserModal').onclick = () => modalRoot.style.display = "none";
  document.getElementById('addUserForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('addUserMsg');
    msg.textContent = "Adding...";
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value.trim();
    const area = document.getElementById('newArea').value.trim();
    const department = document.getElementById('newDept').value.trim();
    const reports_to = document.getElementById('newReportsTo').value.trim();
    if (!username || !password || !role) {
      msg.textContent = "Fill required fields.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await addDoc(collection(db, `clients/${getTenantId()}/users`), {
        username, password, role, area, department, reports_to,
        mustChangePassword: true,
        created_at: serverTimestamp()
      });
      msg.textContent = "Added!";
      msg.style.color = "#28e640";
      await loadUsers();
      modalRoot.style.display = "none";
    } catch (error) {
      msg.textContent = "Error: " + (error.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
}

// ========== EDIT USER MODAL ==========
window.editUser = function(userId) {
  const u = users.find(x => x.id === userId);
  if (!u) return;
  let areaOptions = areas.map(a => `<option value="${a.name}"${u.area===a.name?' selected':''}>${a.name}</option>`).join('');
  let deptOptions = departments.map(d => `<option value="${d.name}"${u.department===d.name?' selected':''}>${d.name}</option>`).join('');
  modalRoot.innerHTML = `
    <div style="background:#223052;padding:32px 26px;border-radius:14px;max-width:420px;margin:60px auto;">
      <h3 style="color:#fdd835;">Edit User</h3>
      <form id="editUserForm">
        <label>Username</label>
        <input type="text" id="editUsername" value="${u.username}" required>
        <label>Role</label>
        <input type="text" id="editRole" value="${u.role}" required>
        <label>Area</label>
        <select id="editArea"><option value="">Unassigned</option>${areaOptions}</select>
        <label>Department</label>
        <select id="editDept"><option value="">Unassigned</option>${deptOptions}</select>
        <label>Reports to</label>
        <input type="text" id="editReportsTo" value="${u.reports_to||''}">
        <button class="users-action-btn" type="submit">Save</button>
        <button class="users-action-btn" type="button" id="closeEditUserModal">Cancel</button>
        <span id="editUserMsg" style="margin-left:10px;color:#fdd835;"></span>
      </form>
    </div>
  `;
  modalRoot.style.display = "flex";
  document.getElementById('closeEditUserModal').onclick = () => modalRoot.style.display = "none";
  document.getElementById('editUserForm').onsubmit = async function (e) {
    e.preventDefault();
    const msg = document.getElementById('editUserMsg');
    msg.textContent = "Saving...";
    const username = document.getElementById('editUsername').value.trim();
    const role = document.getElementById('editRole').value.trim();
    const area = document.getElementById('editArea').value.trim();
    const department = document.getElementById('editDept').value.trim();
    const reports_to = document.getElementById('editReportsTo').value.trim();
    if (!username || !role) {
      msg.textContent = "Fill required fields.";
      msg.style.color = "#ff5050";
      return;
    }
    try {
      await updateDoc(doc(db, `clients/${getTenantId()}/users/${userId}`), {
        username, role, area, department, reports_to
      });
      msg.textContent = "Saved!";
      msg.style.color = "#28e640";
      await loadUsers();
      modalRoot.style.display = "none";
    } catch (error) {
      msg.textContent = "Error: " + (error.message || "Unknown error");
      msg.style.color = "#ff5050";
    }
  };
};

// ========== REMOVE USER ==========
window.removeUser = async function(userId) {
  if (!confirm('Delete this user?')) return;
  try {
    await updateDoc(doc(db, `clients/${getTenantId()}/users/${userId}`), { deleted: true });
    await loadUsers();
  } catch (error) {
    alert('Failed to delete user.');
  }
};

// ========== RESET PASSWORD ==========
window.resetUserPassword = async function(userId) {
  if (!confirm('Reset this user\'s password to default?')) return;
  try {
    await updateDoc(doc(db, `clients/${getTenantId()}/users/${userId}`), {
      password: 'password', mustChangePassword: true
    });
    alert('Password reset to "password". User will be prompted to change on next login.');
  } catch (error) {
    alert('Failed to reset password.');
  }
};

// ========== VIEW USER INSPECTIONS ==========
window.showUserInspections = async function(userId) {
  const u = users.find(x => x.id === userId);
  if (!u) return;
  const snap = await getDocs(query(collection(db, `clients/${getTenantId()}/inspections`), where('inspected_by', '==', u.username)));
  inspections = [];
  snap.forEach(doc => inspections.push({ id: doc.id, ...doc.data() }));
  // Sort: failed first
  inspections.sort((a, b) => (b.status === "failed") - (a.status === "failed"));
  modalRoot.innerHTML = `
    <div style="background:#223052;padding:28px 22px;border-radius:14px;max-width:500px;margin:60px auto;">
      <h3 style="color:#fdd835;">${u.username}'s Inspections</h3>
      <div style="max-height:280px;overflow-y:auto;">
        <table style="width:100%;margin-top:12px;">
          <thead><tr><th>Status</th><th>Asset</th><th>Date</th><th>Details</th></tr></thead>
          <tbody>
            ${inspections.map(i => `
              <tr style="${i.status==='failed'?'color:#ff5050;':''}">
                <td>${i.status || "—"}</td>
                <td>${i.asset_id || "—"}</td>
                <td>${i.created_at ? new Date(i.created_at.seconds*1000).toLocaleString() : "—"}</td>
                <td><button class="users-action-btn" onclick="event.stopPropagation();window.viewInspectionDetail('${i.id}')">View</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="users-action-btn" onclick="modalRoot.style.display='none'">Close</button>
    </div>
  `;
  modalRoot.style.display = "flex";
};

// ========== VIEW SINGLE INSPECTION DETAIL ==========
window.viewInspectionDetail = async function(inspectionId) {
  const snap = await getDocs(query(collection(db, `clients/${getTenantId()}/inspections`), where('__name__', '==', inspectionId)));
  let i = null;
  snap.forEach(doc => { i = { id: doc.id, ...doc.data() }; });
  if (!i) return alert('Inspection not found.');
  modalRoot.innerHTML = `
    <div style="background:#223052;padding:28px 22px;border-radius:14px;max-width:500px;margin:60px auto;">
      <h3 style="color:#fdd835;">Inspection Detail</h3>
      <div><b>Asset:</b> ${i.asset_id || "—"}</div>
      <div><b>Status:</b> ${i.status || "—"}</div>
      <div><b>Date:</b> ${i.created_at ? new Date(i.created_at.seconds*1000).toLocaleString() : "—"}</div>
      <div><b>Comments:</b> ${i.comments || ""}</div>
      <div style="margin-top:14px;"><b>Answers:</b></div>
      <ul>
        ${(i.answers || []).map(a => `<li><b>${a.q || a.question}:</b> ${a.a || a.answer}</li>`).join('')}
      </ul>
      <button class="users-action-btn" onclick="modalRoot.style.display='none'">Close</button>
    </div>
  `;
  modalRoot.style.display = "flex";
};
