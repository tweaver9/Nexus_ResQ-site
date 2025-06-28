window.addEventListener('DOMContentLoaded', async function() {
  const loginForm = document.querySelector('.login-form');
  const logoImg = document.querySelector('.client-logo');
  const errorDiv = document.getElementById('login-error');

  // --- 1. Detect tenant/client by subdomain ---
  const subdomain = window.location.hostname.split('.')[0];

  // --- 2. Supabase setup ---
  const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  // --- 3. Fetch client/tenant row for this subdomain ---
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, logo_url, primary_color, secondary_color, dark_color')
    .eq('name', subdomain)
    .single();

  console.log("Supabase client for login:", { client, clientErr });

  if (!client || clientErr) {
    errorDiv.textContent = "Unknown client. Please use your assigned company link.";
    if (loginForm) loginForm.style.display = "none";
    return;
  }

  // --- 4. Save tenant_id (the client's id) for this session ---
  sessionStorage.setItem('tenant_id', client.id);

  // --- 5. Set logo and color theme ---
  if (client.logo_url && logoImg) logoImg.src = client.logo_url;
  if (client.primary_color) document.body.style.setProperty('--primary-mid', client.primary_color);
  if (client.secondary_color) document.body.style.setProperty('--primary-light', client.secondary_color);
  if (client.dark_color) document.body.style.setProperty('--primary-dark', client.dark_color);

  // --- 6. Login form handler ---
  if (loginForm) loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value.trim();
    errorDiv.textContent = '';

    // --- 7. Query for user with this username + tenant_id (client.id) ---
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id,username,password,role')
      .eq('username', username)
      .eq('tenant_id', client.id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      errorDiv.textContent = "User not found for this client.";
      return;
    }
    const user = users[0];

    // --- 8. Check password (plaintext for now) ---
    if (user.password !== password) {
      errorDiv.textContent = "Incorrect password.";
      return;
    }

    // --- 9. Store session data & redirect to dashboard ---
    sessionStorage.setItem('role', user.role);
    sessionStorage.setItem('username', user.username);
    // tenant_id already saved above

    window.location.href = "dashboard.html";
  });
});
