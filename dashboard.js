document.addEventListener('DOMContentLoaded', () => {
  // --- Multi-tenant session check ---
  const username = sessionStorage.getItem('username');
  const role = sessionStorage.getItem('role');
  const tenantId = sessionStorage.getItem('tenant_id');

  if (!username || !role || !tenantId) {
    window.location.href = "login.html";
    return;
  }

  // --- Supabase setup ---
  const { createClient } = supabase;
  const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  // --- DOM elements ---
  const syncStatusEl = document.getElementById('sync-status');
  const lastSyncEl = document.getElementById('last-sync');
  const progressSummaryEl = document.getElementById('progress-summary');
  const zoneGridEl = document.querySelector('.zone-grid');
  const activityLogEl = document.getElementById('activity-log');
  const searchInputEl = document.getElementById('search-input');
  const logoutBtn = document.getElementById('logout-btn');
  const clientLogoEl = document.getElementById('client-logo');
  const dashboardTitleEl = document.getElementById('dashboard-title');
  const addClientBtn = document.getElementById('add-client-btn');
console.log("About to fetch client info for tenantId:", tenantId);
  // --- Branding: Fetch client info by tenantId and set logo/color ---
  (async () => {
    const { data: client, error: clientErr } = await supabaseClient
      .from('clients')
      .select('id, logo_url, color, name')
      .eq('id', tenantId)
      .single();
    console.log("Fetched client:", client, "Error:", clientErr);
    
    if (client && client.logo_url && clientLogoEl) clientLogoEl.src = client.logo_url;
    if (client && client.color) document.body.style.setProperty('--client-color', client.color);
    if (client && client.name && dashboardTitleEl) {
      dashboardTitleEl.textContent = `${client.name.charAt(0).toUpperCase() + client.name.slice(1)} Dashboard`;
    }

    // --- Show/hide Add Client button for Nexus only ---
    const NEXUS_UUID = '6dd68681-bed6-40b2-88d4-f9b3cf36ad9e';
    if (addClientBtn) {
      if (client && client.id === NEXUS_UUID) {
        console.log("Showing Add Client button");
        addClientBtn.style.display = ''; // Show the button for Nexus only
      } else {
        console.log("Hiding Add Client button");
        addClientBtn.style.display = 'none'; // Hide for all others
      }
    }
    // --- Welcome message ---
const welcomeEl = document.getElementById("welcome-message");
if (welcomeEl) {
  welcomeEl.innerHTML = `Welcome, <b>${username}</b> <span class="role-indicator">(${role})</span>`;
}
  })();

  // --- Initialize dashboard ---
  initDashboard();
  if (searchInputEl) searchInputEl.addEventListener('input', handleSearch);

  // --- FUNCTIONS ---

  async function initDashboard() {
    await updateSyncStatus();
    await loadZones();
    await loadActivityLog();
  }

  // Update sync status and last sync timestamp
  async function updateSyncStatus() {
    const online = navigator.onLine;
    syncStatusEl.textContent = online ? 'Sync: Online' : 'Sync: Offline';
    const lastSync = localStorage.getItem('lastSync') || 'Never';
    lastSyncEl.textContent = `Last Sync: ${lastSync}`;
  }

  // Load zone cards - filtered by tenant_id!
  async function loadZones() {
    const { data: zones, error } = await supabaseClient
      .from('zones')
      .select('id,name,total_assets,completed_assets')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading zones:', error);
      return;
    }

    zoneGridEl.innerHTML = '';
    let grandTotal = 0, grandCompleted = 0;

    if (zones) {
      zones.forEach(zone => {
        grandTotal += zone.total_assets;
        grandCompleted += zone.completed_assets;

        const card = document.createElement('div');
        card.className = 'zone-card';
        card.innerHTML = `
          <h3>${zone.name}</h3>
          <p>${zone.completed_assets}/${zone.total_assets} Complete</p>
          <button onclick="startInspection('${zone.id}')">Start Inspection</button>
        `;
        zoneGridEl.appendChild(card);
      });
    }

    // Update overall progress
    progressSummaryEl.textContent = ` ${grandCompleted}/${grandTotal} Complete`;
  }

  // Load recent activity - filtered by tenant_id!
  async function loadActivityLog() {
    const { data: logs, error } = await supabaseClient
      .from('activity_log')
      .select('id,message,created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading activity log:', error);
      return;
    }

    activityLogEl.innerHTML = '';
    if (logs) {
      logs.forEach(log => {
        const li = document.createElement('li');
        const time = new Date(log.created_at).toLocaleTimeString();
        li.textContent = `${time} – ${log.message}`;
        activityLogEl.appendChild(li);
      });
    }
  }

  // Search handler (basic client-side filter)
  function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.zone-card').forEach(card => {
      const name = card.querySelector('h3').textContent.toLowerCase();
      card.style.display = name.includes(term) ? 'block' : 'none';
    });
  }

  // Logout logic
  const logoutLinkE1 = document.getElementById('logout-link');
  if (logoutLinkE1) {
    logoutLinkE1.onclick =
  function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
  }

  // Start inspection for a zone
  window.startInspection = function(zoneId) {
    window.location.href = `inspection.html?zone=${zoneId}`;
  };
});
