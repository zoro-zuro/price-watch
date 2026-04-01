const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    // Use the promisified runAsync
    db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, password_hash], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'User already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      const token = jwt.sign({ userId: this.lastID }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '24h' });
      res.json({ token, email });
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '24h' });
    res.json({ token, email });
  });
});

module.exports = router;
