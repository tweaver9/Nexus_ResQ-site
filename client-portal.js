// === SUPABASE SETUP ===
const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadClientLogos() {
  const grid = document.getElementById('logoGrid');
  if (!grid) return;
  grid.innerHTML = "Loading companies...";

  // Get all clients from Supabase (order alphabetically by name)
  const { data: clients, error } = await supabase
    .from('clients')
    .select('name, logo')
    .order('name');

  grid.innerHTML = "";

  // Show client logos from Supabase
  if (!error && Array.isArray(clients) && clients.length > 0) {
    clients.forEach(client => {
      // Use the correct field for logo (should be "logo")
      let logo = client.logo
        ? `<img src="${client.logo}" alt="${client.name}" />`
        : `<div style="width:100px;height:80px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:1.4em;background:#223052;border-radius:8px;">${client.name[0] || "?"}</div>`;

      // Link to the correct subdomain for login
      let link = `<a href="https://${client.name}.nexusresq.com" title="${client.name}">
                    ${logo}
                  </a>`;
      grid.insertAdjacentHTML('beforeend', link);
    });
  } else {
    grid.innerHTML = "<div>No clients found.</div>";
  }
}

window.addEventListener('DOMContentLoaded', loadClientLogos);
