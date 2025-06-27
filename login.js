window.addEventListener('DOMContentLoaded', async function() {
  const loginForm = document.querySelector('.login-form');
  const logoImg = document.querySelector('.client-logo');
  const errorDiv = document.getElementById('login-error');

  // Tenant detection via subdomain
  const subdomain = window.location.hostname.split('.')[0];

  // Supabase setup
  const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
  const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your real anon key
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
  // Save client_id for later pages
  sessionStorage.setItem('client_id', client.id);

  // Set logo and theme color if available
  if (client.logo && logoImg) logoImg.src = client.logo;
  if (client.color) document.body.style.setProperty('--client-color', client.color);

  // Login form handler
  if (loginForm) loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value.trim();
    errorDiv.textContent = '';

    // Look up user by username AND client_id
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id,username,password,role')
      .eq('username', username)
      .eq('client_id', client.id)
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
    // client_id already saved above

    window.location.href = "dashboard.html";
  });
});
