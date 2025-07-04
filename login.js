import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function showClientLogo() {
  // Assume you parse subdomain, e.g. "citgo"
  const subdomain = window.location.hostname.split('.')[0];

  // Query the client doc using subdomain as doc ID
  const clientSnap = await getDoc(doc(db, "clients", subdomain));
  if (!clientSnap.exists()) return; // fallback or error

  const client = clientSnap.data();
  const logoUrl = client.logoUrl || client.logo_url || "";
  if (logoUrl) {
    document.getElementById('client-logo').src = logoUrl;
  } else {
    // fallback to text tile or default logo
    document.getElementById('client-logo').src = "default.png";
  }
}

window.addEventListener('DOMContentLoaded', showClientLogo);
