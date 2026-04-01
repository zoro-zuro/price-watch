const express = require('express');
const { searchAmazon } = require('../scrapers/scrapingdog');
const { searchGoogleShopping } = require('../scrapers/serper');
const db = require('../db');
const router = express.Router();

const CACHE_TIME_MS = 15 * 60 * 1000;

router.get('/', async (req, res) => {
  const query = req.query.q?.toLowerCase().trim();
  const stores = req.query.stores ? req.query.stores.split(',') : [];
  
  if (!query) return res.status(400).json({ error: 'Search query required' });

  // Use unique key including stores for cache
  const cacheKey = `${query}_${stores.sort().join(',')}`;

  db.get('SELECT * FROM search_cache WHERE query = ?', [cacheKey], async (err, cached) => {
    if (!err && cached) {
      const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
      if (cacheAge < CACHE_TIME_MS) {
        return res.json(JSON.parse(cached.results_json));
      }
    }

    try {
      // Call scrapers with the store filter
      const [amazonResults, shoppingResults] = await Promise.all([
        searchAmazon(query, stores),
        searchGoogleShopping(query, stores)
      ]);

      const combined = [...amazonResults, ...shoppingResults];
      
      const seenTitles = new Set();
      const unique = combined.filter(item => {
        const title = item.title.toLowerCase();
        if (seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
      });

      // Sort by price (low to high) for best comparison
      unique.sort((a, b) => (a.price || 0) - (b.price || 0));

      db.run('INSERT OR REPLACE INTO search_cache (query, results_json) VALUES (?, ?)', 
        [cacheKey, JSON.stringify(unique)]);

      res.json(unique);
    } catch (err) {
      console.error('Search error:', err.message);
      res.status(500).json({ error: 'Search failed' });
    }
  });
});

module.exports = router;
