import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, username, password, role } = req.body;

    // LOGIN
    if (action === 'login') {
      // Try to find this user
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .limit(1);

      if (error) {
        return res.status(500).json({ success: false, message: 'Database error.' });
      }
      if (users && users.length === 1) {
        return res.status(200).json({
          success: true,
          message: `Login successful! Welcome, ${username}.`,
          role: users[0].role,
          username: users[0].username
        });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
    }

    // ADD USER
    if (action === 'addUser') {
      // Add a new user
      if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'All fields required' });
      }
      // Check if username already exists
      const { data: existing, error: error2 } = await supabase
        .from('users')
        .select('id')
        .eq('username', username);

      if (error2) {
        return res.status(500).json({ success: false, message: 'Database error.' });
      }
      if (existing && existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Username already exists' });
      }
      // Insert new user
      const { error: error3 } = await supabase
        .from('users')
        .insert([{ username, password, role }]);

      if (error3) {
        return res.status(500).json({ success: false, message: 'Failed to add user.' });
      }
      return res.status(201).json({ success: true, message: 'User added.' });
    }

    // UNKNOWN ACTION
    return res.status(400).json({ success: false, message: 'Unknown action.' });

  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
