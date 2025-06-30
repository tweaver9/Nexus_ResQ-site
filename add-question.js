// add-question.js
import { db } from './firebase.js';
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore";

const tenantId = sessionStorage.getItem('tenant_id');
if (!tenantId) {
  window.location.href = "login.html";
}

// Populate Asset Types on load
window.addEventListener('DOMContentLoaded', async () => {
  const sel = document.getElementById('typeId');
  sel.innerHTML = `<option value="">Loading types...</option>`;
  try {
    const typeSnap = await getDocs(
      query(collection(db, `clients/${tenantId}/assetTypes`), orderBy('name', 'asc'))
    );
    if (!typeSnap.empty) {
      sel.innerHTML = `<option value="">Select Type</option>` +
        Array.from(typeSnap.docs).map(
          docSnap => `<option value="${docSnap.id}">${docSnap.data().name}</option>`
        ).join('');
    } else {
      sel.innerHTML = `<option value="">(No types found!)</option>`;
    }
  } catch {
    sel.innerHTML = `<option value="">(Error loading types!)</option>`;
  }
});

document.getElementById('addQuestionForm').onsubmit = async function(e) {
  e.preventDefault();
  const msg = document.getElementById('formQuestionMsg');
  msg.style.color = "#fdd835";
  msg.textContent = "Adding...";
  document.getElementById('submitQuestionBtn').disabled = true;

  const type_id = document.getElementById('typeId').value;
  const frequency = document.getElementById('frequency').value;
  const question = document.getElementById('questionText').value.trim();
  const order = parseInt(document.getElementById('orderNum').value, 10);

  // Grab all checked answer options
  const options = [];
  document.querySelectorAll('#optionsCheckboxes input[type="checkbox"]:checked').forEach(cb => {
    options.push(cb.value);
  });

  const critical = document.getElementById('critical').checked;
  const requires_comment = document.getElementById('requires_comment').checked;
  const requires_photo = document.getElementById('requires_photo').checked;
  const allow_photo = document.getElementById('allow_photo').checked;
  // required is always true

  if (!type_id || !question || !frequency || options.length < 2) {
    msg.style.color = "#ff5050";
    msg.textContent = "Fill out all fields (at least 2 options).";
    document.getElementById('submitQuestionBtn').disabled = false;
    return;
  }

  try {
    await addDoc(collection(db, `clients/${tenantId}/assetQuestions`), {
      type_id,
      frequency,
      question,
      order,
      options,
      critical,
      requires_comment,
      requires_photo,
      allow_photo,
      required: true
    });
    msg.style.color = "#28e640";
    msg.textContent = "Question added!";
    this.reset();
  } catch (error) {
    msg.style.color = "#ff5050";
    msg.textContent = "Error: " + (error.message || "Unknown error");
  }
  document.getElementById('submitQuestionBtn').disabled = false;
};
