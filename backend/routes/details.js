const express = require('express');
const axios = require('axios');
const db = require('../db');
const { getProductSummary } = require('../utils/groq');
const router = express.Router();

const SUMMARY_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

router.get('/', async (req, res) => {
  const { url, title } = req.query;
  if (!url || !title) return res.status(400).json({ error: 'URL and Title required' });

  // PERFORMANCE FIX: Check AI Summary Cache
  db.get('SELECT * FROM ai_summaries_cache WHERE product_url = ?', [url], async (err, row) => {
    if (!err && row) {
      const cacheAge = Date.now() - new Date(row.cached_at).getTime();
      if (cacheAge < SUMMARY_CACHE_MS) {
        console.log(`AI Cache hit for: "${title}"`);
        return res.json({ summary: row.summary, fromCache: true });
      }
    }

    // Cache Miss: Scrape and Summarize
    let reviews = [];
    if (url.includes('amazon.in')) {
      const apiKey = process.env.SCRAPINGDOG_API_KEY;
      const directUrl = `https://api.scrapingdog.com/amazon?api_key=${apiKey}&domain=in&type=product&url=${encodeURIComponent(url)}`;
      try {
        console.log(`Scraping reviews for AI summary: ${title}`);
        const response = await axios.get(directUrl);
        if (response.data && response.data.customer_reviews) {
          reviews = response.data.customer_reviews.slice(0, 5).map(r => r.review_text);
        }
      } catch (err) {
        console.error('Scraper Error (Reviews):', err.message);
      }
    }

    const summary = await getProductSummary(title, reviews);
    
    // Save to cache
    db.run('INSERT OR REPLACE INTO ai_summaries_cache (product_url, summary) VALUES (?, ?)', 
      [url, summary]);

    res.json({ summary, reviewsCount: reviews.length, fromCache: false });
  });
});

module.exports = router;
