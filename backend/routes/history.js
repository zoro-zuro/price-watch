const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  db.all(`
    SELECT price, scraped_at FROM price_history 
    WHERE product_url = ? 
    ORDER BY scraped_at ASC
  `, [url], (err, history) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(history);
  });
});

module.exports = router;
