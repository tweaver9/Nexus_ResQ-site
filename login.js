import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Utility: Get the subdomain from the window.location
function getSubdomain() {
  const host = window.location.hostname;
  // e.g. "citgo.nexusresq.com" -> "citgo"
  if (!host.includes('nexusresq.com')) return null;
  return host.split('.')[0];
}

async function loadClientLogo() {
  const subdomain = getSubdomain();
  if (!subdomain) return; // fallback

  const docRef = doc(db, "clients", subdomain);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const client = snap.data();
    const logoUrl = client.logoUrl || client.logo_url || "";
    if (logoUrl) {
      document.getElementById('client-logo').src = logoUrl;
      document.getElementById('client-logo').alt = client.name + " logo";
    }
  }
}

window.addEventListener('DOMContentLoaded', loadClientLogo);
