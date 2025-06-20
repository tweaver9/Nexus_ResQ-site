import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';

const supabase = createClient(supabaseUrl, supabaseKey);
export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    // Demo users with roles
    const users = [
      { username: 'admin', password: 'password123', role: 'admin' },
      { username: 'tyler', password: 'paramedic2024', role: 'user' },
      { username: 'curtis', password: 'fireman2024', role: 'user' }
    ];

    // Find a matching user
    const validUser = users.find(
      user => user.username === username && user.password === password
    );

    if (validUser) {
      res.status(200).json({ 
        success: true, 
        message: `Login successful! Welcome, ${username}.`,
        role: validUser.role,
        username: validUser.username
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
