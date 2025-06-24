// File: dashboard.js
// Core dashboard logic for Nexus Res-Q
// Assumes Supabase client library is loaded separately

// Placeholder Supabase initialization (replace with real credentials)
const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const syncStatusEl = document.getElementById('sync-status');
const lastSyncEl = document.getElementById('last-sync');
const progressSummaryEl = document.getElementById('progress-summary');
const zoneGridEl = document.querySelector('.zone-grid');
const activityLogEl = document.getElementById('activity-log');
const searchInputEl = document.getElementById('search-input');
const logoutBtn = document.getElementById('logout-btn');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  logoutBtn.addEventListener('click', handleLogout);
  searchInputEl.addEventListener('input', handleSearch);
});

async function initDashboard() {
  await updateSyncStatus();
  await loadZones();
  await loadActivityLog();
}

// Update sync status and last sync timestamp
async function updateSyncStatus() {
  const { data: health } = await supabase.rpc('health_check'); // example RPC
  const online = navigator.onLine;
  syncStatusEl.textContent = online ? '🔄 Sync: Online' : '🔄 Sync: Offline';
  const lastSync = localStorage.getItem('lastSync') || 'Never';
  lastSyncEl.textContent = `🕓 Last Sync: ${lastSync}`;
}

// Load zone cards
async function loadZones() {
  // Fetch zones and progress from Supabase
  const { data: zones, error } = await supabase
    .from('zones')
    .select('id,name,total_assets,completed_assets')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error loading zones:', error);
    return;
  }

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

  // Update overall progress
  progressSummaryEl.textContent = `✅ ${grandCompleted}/${grandTotal} Complete`;  
}

// Load recent activity
async function loadActivityLog() {
  const { data: logs, error } = await supabase
    .from('activity_log')
    .select('id,message,created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error loading activity log:', error);
    return;
  }

  activityLogEl.innerHTML = '';
  logs.forEach(log => {
    const li = document.createElement('li');
    const time = new Date(log.created_at).toLocaleTimeString();
    li.textContent = `${time} – ${log.message}`;
    activityLogEl.appendChild(li);
  });
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
function handleLogout() {
  // Clear session and redirect
  localStorage.clear();
  window.location.href = 'login.html';
}

// Start inspection for a zone
function startInspection(zoneId) {
  window.location.href = `inspection.html?zone=${zoneId}`;
}
