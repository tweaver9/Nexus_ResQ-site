import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://vainwbdealnttojooghw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW53YmRlYWxudHRvam9vZ2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTc3MjAsImV4cCI6MjA2NTkzMzcyMH0.xewtWdupuo6TdQBHwGsd1_Jj6v5nmLbVsv_rc-RqqAU';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, username, password, role, adminRole, targetUser, newPassword } = req.body;

    // LOGIN
    if (action === 'login') {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .limit(1);

      if (error) return res.status(500).json({ success: false, message: 'Database error.' });

      if (users && users.length === 1) {
        // Update last_login on login success
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('username', username);

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

    // Admin-Only APIs
    if (adminRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admins only.' });
    }

    // LIST USERS
    if (action === 'listUsers') {
      const { data: users, error } = await supabase
        .from('users')
        .select('username, role, last_login')
        .order('username');
      if (error) return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
      return res.status(200).json({ success: true, users });
    }

    // ADD USER
    if (action === 'addUser') {
      if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'All fields required' });
      }
      const { data: existing, error: error2 } = await supabase
        .from('users')
        .select('id')
        .eq('username', username);

      if (error2) return res.status(500).json({ success: false, message: 'Database error.' });
      if (existing && existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Username already exists' });
      }
      const { error: error3 } = await supabase
        .from('users')
        .insert([{ username, password, role }]);

      if (error3) return res.status(500).json({ success: false, message: 'Failed to add user.' });
      return res.status(201).json({ success: true, message: 'User added.' });
    }

    // DELETE USER
    if (action === 'deleteUser') {
      if (!targetUser) return res.status(400).json({ success: false, message: 'Username required.' });
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', targetUser);
      if (error) return res.status(500).json({ success: false, message: 'Failed to delete user.' });
      return res.status(200).json({ success: true, message: 'User deleted.' });
    }

    // VIEW USER
    if (action === 'viewUser') {
      if (!targetUser) return res.status(400).json({ success: false, message: 'Username required.' });
      const { data: users, error } = await supabase
        .from('users')
        .select('username, role, last_login')
        .eq('username', targetUser)
        .limit(1);
      if (error || !users || users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      return res.status(200).json({ success: true, user: users[0] });
    }

    // CHANGE PASSWORD
    if (action === 'changePassword') {
      if (!targetUser || !newPassword) return res.status(400).json({ success: false, message: 'Missing fields.' });
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('username', targetUser);
      if (error) return res.status(500).json({ success: false, message: 'Failed to change password.' });
      return res.status(200).json({ success: true, message: 'Password changed.' });
    }

    // UNKNOWN ACTION
    return res.status(400).json({ success: false, message: 'Unknown action.' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
