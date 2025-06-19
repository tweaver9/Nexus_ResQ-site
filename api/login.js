export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    // Hardcoded demo users (you can add as many as you like)
    const users = [
      { username: 'admin', password: 'password123' },
      { username: 'tyler', password: 'paramedic2024' },
      { username: 'curtis', password: 'fireman2024' }
    ];

    // Check if any user matches
    const validUser = users.find(
      user => user.username === username && user.password === password
    );

    if (validUser) {
      res.status(200).json({ success: true, message: `Login successful! Welcome, ${username}.` });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
