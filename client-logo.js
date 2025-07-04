// client-logo.js
import { db } from './firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Use Firestore as: db.collection(...), db.doc(...), etc.

async function loadClientLogos() {
  const grid = document.getElementById('logoGrid');
  grid.innerHTML = "Loading companies...";

  // Get all clients from Firestore (order alphabetically by name)
  const q = query(collection(db, "clients"), orderBy("name", "asc"));
  const snapshot = await getDocs(q);

  grid.innerHTML = "";

  if (!snapshot.empty) {
    snapshot.forEach(docSnap => {
      const client = docSnap.data();

     let logoUrl = client.logoUrl || client.logo_url || "";  // Try camelCase, then snake_case, then blank
      let logo = logoUrl
        ? `<img src="${logoUrl}" alt="${client.name} logo" />`
        : `<div style="width:100px;height:80px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:1.4em;background:#223052;border-radius:8px;">${client.name?.[0] || "?"}</div>`;

      let link = `<a href="https://${client.subdomain}.nexusresq.com/login.html" title="${client.name}">
                    ${logo}
                  </a>`;
      grid.insertAdjacentHTML('beforeend', link);
    });
  } else {
    grid.innerHTML = "<div>No clients found.</div>";
  }
}

window.addEventListener('DOMContentLoaded', loadClientLogos);
