// This is a simple backend route for Vercel

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    // For demo: hard-coded user (replace this later with real DB lookup)
    if (username === 'admin' && password === 'password123') {
      res.status(200).json({ success: true, message: 'Login successful!' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
