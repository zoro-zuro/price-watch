const express = require('express');
const db = require('../db');
const authMiddleware = require('../auth');
const router = express.Router();

// Add to watchlist
router.post('/watch', authMiddleware, (req, res) => {
  const { title, url, image, store, price } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL required' });

  db.run(`
    INSERT OR REPLACE INTO watched_products (user_id, product_title, product_url, product_image, store)
    VALUES (?, ?, ?, ?, ?)
  `, [req.userId, title, url, image, store], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to add to watchlist' });

    // Also insert initial price into history
    if (price) {
      db.run('INSERT INTO price_history (product_url, price) VALUES (?, ?)', [url, price]);
    }
    
    res.json({ id: this.lastID, message: 'Added to watchlist' });
  });
});

// List watched products for a user
router.get('/watched', authMiddleware, (req, res) => {
  db.all('SELECT * FROM watched_products WHERE user_id = ?', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Set/update target price for alert
router.post('/alert/:id', authMiddleware, (req, res) => {
  const { target_price } = req.body;
  db.run('UPDATE watched_products SET target_price = ? WHERE id = ? AND user_id = ?', 
    [target_price, req.params.id, req.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update alert' });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Target price updated' });
  });
});

// Remove from watchlist
router.delete('/watch/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM watched_products WHERE id = ? AND user_id = ?', 
    [req.params.id, req.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to remove product' });
    if (this.changes === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Removed from watchlist' });
  });
});

module.exports = router;
