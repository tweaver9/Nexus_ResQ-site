window.addEventListener('DOMContentLoaded', async function() {
  const loginForm = document.querySelector('.login-form');
  const logoImg = document.querySelector('.client-logo');
  const errorDiv = document.getElementById('login-error');

  // Tenant detection via subdomain
  const subdomain = window.location.hostname.split('.')[0];

  // Supabase setup
  const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU'; // Replace with your real anon key
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  // Fetch branding for this subdomain/client
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, logo, color')
    .eq('name', subdomain)
    .single();

  if (!client || clientErr) {
    errorDiv.textContent = "Unknown client. Please use your assigned company link.";
    loginForm.style.display = "none";
    return;
  }
  // Save tenant_id for later pages
  sessionStorage.setItem('tenant_id', tenant.id);

  // Set logo and theme color if available
  if (client.logo && logoImg) logoImg.src = client.logo;
  if (client.color) document.body.style.setProperty('--client-color', client.color);

  // Login form handler
  if (loginForm) loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value.trim();
    errorDiv.textContent = '';

    // Look up user by username AND tenant_id
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id,username,password,role')
      .eq('username', username)
      .eq('tenant_id', tenant.id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      errorDiv.textContent = "User not found for this client.";
      return;
    }
    const user = users[0];
    // For demo: plain-text password check. Replace with secure hash in production.
    if (user.password !== password) {
      errorDiv.textContent = "Incorrect password.";
      return;
    }

    // Save session data
    sessionStorage.setItem('role', user.role);
    sessionStorage.setItem('username', user.username);
    // tenant_id already saved above

    window.location.href = "dashboard.html";
  });
});
