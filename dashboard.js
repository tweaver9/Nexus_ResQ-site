document.addEventListener('DOMContentLoaded', async () => {
  const subdomain = window.location.hostname.split('.')[0];
  let clientId = sessionStorage.getItem('client_id');

  if (!clientId) {
    const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU'; // Replace with your key
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    const { data: client, error } = await supabaseClient
      .from('clients')
      .select('id')
      .eq('name', subdomain)
      .single();
    if (error || !client) {
      alert("Client not found. Please access from your unique subdomain.");
      window.location.href = "login.html";
      return;
    }
    clientId = client.id;
    sessionStorage.setItem('client_id', clientId);
  }

  const username = sessionStorage.getItem('username');
  const role = sessionStorage.getItem('role');
  if (!username || !role) {
    window.location.href = "login.html";
    return;
  }

  const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
  const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your key
  const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

  const syncStatusEl = document.getElementById('sync-status');
  const lastSyncEl = document.getElementById('last-sync');
  const progressSummaryEl = document.getElementById('progress-summary');
  const zoneGridEl = document.querySelector('.zone-grid');
  const activityLogEl = document.getElementById('activity-log');
  const searchInputEl = document.getElementById('search-input');
  const logoutBtn = document.getElementById('logout-btn');

  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (searchInputEl) searchInputEl.addEventListener('input', handleSearch);

  await initDashboard();

  async function initDashboard() {
    await updateSyncStatus();
    await loadZones();
    await loadActivityLog();
  }

  async function updateSyncStatus() {
    const online = navigator.onLine;
    if (syncStatusEl) syncStatusEl.textContent = online ? '🔄 Sync: Online' : '🔄 Sync: Offline';
    if (lastSyncEl) {
      const lastSync = localStorage.getItem('lastSync') || 'Never';
      lastSyncEl.textContent = `🕓 Last Sync: ${lastSync}`;
    }
  }

  async function loadZones() {
    const { data: zones, error } = await supabaseClient
      .from('zones')
      .select('id,name,total_assets,completed_assets')
      .eq('client_id', clientId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading zones:', error);
      return;
    }

    if (!zoneGridEl) return;
    zoneGridEl.innerHTML = '';
    let grandTotal = 0, grandCompleted = 0;

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

    if (progressSummaryEl)
      progressSummaryEl.textContent = `✅ ${grandCompleted}/${grandTotal} Complete`;
  }

  async function loadActivityLog() {
    const { data: logs, error } = await supabaseClient
      .from('activity_log')
      .select('id,message,created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading activity log:', error);
      return;
    }

    if (!activityLogEl) return;
    activityLogEl.innerHTML = '';
    logs.forEach(log => {
      const li = document.createElement('li');
      const time = new Date(log.created_at).toLocaleTimeString();
      li.textContent = `${time} – ${log.message}`;
      activityLogEl.appendChild(li);
    });
  }

  function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.zone-card').forEach(card => {
      const name = card.querySelector('h3').textContent.toLowerCase();
      card.style.display = name.includes(term) ? 'block' : 'none';
    });
  }

  function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
  }

  window.startInspection = function (zoneId) {
    window.location.href = `inspection.html?zone=${zoneId}`;
  };
});
