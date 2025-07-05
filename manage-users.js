import { db } from './firebase.js';
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, Timestamp
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

// --- CONFIG ---
const clientName = sessionStorage.getItem('tenant_id') || 'testclient'; // or however you get the client

// --- DOM ELEMENTS ---
const userList = document.getElementById('userList');
const noUsersMsg = document.getElementById('noUsersMsg');
const addUserBtn = document.getElementById('addUserBtn');
const modalRoot = document.getElementById('modal-root');

// --- RENDER USERS ---
async function renderUsers() {
  userList.innerHTML = '';
  noUsersMsg.style.display = 'none';

  const usersCol = collection(db, 'clients', clientName, 'users');
  const snap = await getDocs(usersCol);
  if (snap.empty) {
    noUsersMsg.style.display = '';
    return;
  }
  snap.forEach(docSnap => {
    const u = docSnap.data();
    const card = document.createElement('div');
    card.className = 'user-card';
    card.innerHTML = `
      <div class="user-header">
        <span><b>${u.first_name} ${u.last_name}</b> <span class="user-role">(${u.role})</span></span>
        <span class="user-meta">${u.username}</span>
      </div>
      <div class="user-meta">Created: ${u.created?.toDate ? u.created.toDate().toLocaleString() : ''}</div>
      <div class="user-actions">
        <button class="users-action-btn danger" data-username="${u.username}" data-action="remove">Remove</button>
        <button class="users-action-btn" data-username="${u.username}" data-action="reset">Reset Password</button>
      </div>
    `;
    userList.appendChild(card);
  });

  // Attach action handlers
  userList.querySelectorAll('button[data-action="remove"]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Remove this user?')) return;
      await deleteDoc(doc(db, 'clients', clientName, 'users', btn.dataset.username));
      renderUsers();
    };
  });
  userList.querySelectorAll('button[data-action="reset"]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Generate a password reset code for this user?')) return;
      const resetCode = generateResetCode();
      await updateDoc(doc(db, 'clients', clientName, 'users', btn.dataset.username), {
        reset_code: resetCode,
        reset_code_created: Timestamp.now(),
        must_change_password: true
      });
      alert(`Password reset code for ${btn.dataset.username}: ${resetCode}\n\nSend this code to the user. They will be prompted to enter it and set a new password on next login.`);
      renderUsers();
    };
  });
}

// --- ADD USER MODAL ---
addUserBtn.onclick = () => {
  modalRoot.innerHTML = `
    <div style="background:#22345a;padding:28px 24px;border-radius:12px;min-width:320px;max-width:90vw;">
      <div style="font-weight:600;font-size:1.1em;margin-bottom:10px;">Add User</div>
      <form id="add-user-form">
        <input type="text" id="first_name" placeholder="First Name" required style="width:100%;margin-bottom:10px;">
        <input type="text" id="last_name" placeholder="Last Name" required style="width:100%;margin-bottom:10px;">
        <input type="password" id="password" placeholder="Password" required style="width:100%;margin-bottom:10px;">
        <select id="role" required style="width:100%;margin-bottom:10px;">
          <option value="user">User</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <div style="text-align:right;">
          <button type="button" id="cancel-add-user" class="users-action-btn danger">Cancel</button>
          <button type="submit" class="users-action-btn">Add User</button>
        </div>
      </form>
    </div>
  `;
  modalRoot.style.display = 'flex';

  document.getElementById('cancel-add-user').onclick = () => {
    modalRoot.style.display = 'none';
    modalRoot.innerHTML = '';
  };

  document.getElementById('add-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const first_name = document.getElementById('first_name').value.trim();
    const last_name = document.getElementById('last_name').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;
    const username = `${first_name[0]}${last_name}`.toLowerCase() + '@' + slugify(clientName);

    // Hash the password before storing
    const hashedPassword = bcrypt.hashSync(password, 10);

    const userDoc = {
      first_name,
      last_name,
      password: hashedPassword,
      role,
      username,
      created: Timestamp.now(),
      must_change_password: true
    };
    await setDoc(doc(db, 'clients', clientName, 'users', username), userDoc);
    modalRoot.style.display = 'none';
    modalRoot.innerHTML = '';
    renderUsers();
  };
};

// --- INITIAL LOAD ---
renderUsers();

