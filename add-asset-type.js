// add-asset-type.js
import { db } from './firebase.js';
import { collection, addDoc } from "firebase/firestore";

const tenantId = sessionStorage.getItem('tenant_id');
if (!tenantId) {
  window.location.href = "login.html";
}

document.getElementById('addTypeForm').onsubmit = async function(e) {
  e.preventDefault();
  const msg = document.getElementById('formTypeMsg');
  msg.style.color = "#fdd835";
  msg.textContent = "Adding...";
  document.getElementById('submitTypeBtn').disabled = true;

  const name = document.getElementById('typeName').value.trim();

  if (!name) {
    msg.style.color = "#ff5050";
    msg.textContent = "Please enter a type name.";
    document.getElementById('submitTypeBtn').disabled = false;
    return;
  }

  try {
    await addDoc(collection(db, `clients/${tenantId}/assetTypes`), { name });
    msg.style.color = "#28e640";
    msg.textContent = "Asset type added!";
    this.reset();
  } catch (error) {
    msg.style.color = "#ff5050";
    msg.textContent = "Error: " + (error.message || "Unknown error");
  }
  document.getElementById('submitTypeBtn').disabled = false;
};
