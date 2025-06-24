// File: login.js
// Basic username/password authentication for demo/testing ONLY

const { createClient } = supabase;
const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co'; // <-- put your real project URL here
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU'; // <-- your real anon/public key
const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
});

async function handleLoginSubmit(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  // Query users table for match (plaintext, demo use only!)
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error || !data) {
    alert('Login failed: Invalid credentials.');
    return;
  }

  // Store user data in localStorage
  localStorage.setItem('user_id', data.id);
  localStorage.setItem('username', data.username);
  localStorage.setItem('user_role', data.role);

  // Redirect to dashboard
  window.location.href = 'nexus-dashboard.html';
}
