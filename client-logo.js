// client-logo.js
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function loadClientLogos() {
  const grid = document.getElementById('logoGrid');
  if (!grid) return; // Defensive: no grid div found

  grid.innerHTML = "Loading companies...";

  try {
    // Get all clients (removed orderBy to avoid index requirement)
    const snapshot = await getDocs(collection(db, "clients"));

    grid.innerHTML = ""; // Clear loading text

    if (!snapshot.empty) {
      // Convert to array and sort by name client-side
      const clients = [];
      snapshot.forEach(docSnap => {
        clients.push({ id: docSnap.id, data: docSnap.data() });
      });
      
      // Sort alphabetically by name
      clients.sort((a, b) => {
        const nameA = (a.data.name || a.id).toLowerCase();
        const nameB = (b.data.name || b.id).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      clients.forEach(({ id, data: client }) => {
        const subdomain = client.subdomain || id; // fallback to doc id if subdomain missing

        // Use camelCase only, fallback to snake_case if needed (legacy)
        let logoUrl = client.logoUrl || client.logo_url || "";
        let logo = logoUrl
          ? `<img src="${logoUrl}" alt="${client.name || subdomain} logo" style="height:54px;max-width:140px;margin-bottom:8px;object-fit:contain;background:#fff;border-radius:8px;padding:5px;">`
          : `<div style="width:100px;height:80px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:1.4em;background:#223052;border-radius:8px;">${client.name?.[0] || subdomain[0] || "?"}</div>`;

        let name = client.name || subdomain;
        let link = `<a href="https://${subdomain}.nexusresq.com/login.html" title="${name}" style="display:inline-block;text-align:center;margin:15px 16px 20px 0;">
                      ${logo}
                      <div style="color:#fdd835;font-size:1.05em;font-weight:500;margin-top:4px;">${name}</div>
                    </a>`;
        grid.insertAdjacentHTML('beforeend', link);
      });
    } else {
      grid.innerHTML = "<div>No clients found.</div>";
    }
  } catch (err) {
    grid.innerHTML = `<div style="color:#f33;">Error loading companies: ${err.message}</div>`;
  }
}

window.addEventListener('DOMContentLoaded', loadClientLogos);
