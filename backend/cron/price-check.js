const cron = require('node-cron');
const db = require('../db');
const { fetchAmazonPrice } = require('../scrapers/scrapingdog');
const { fetchSerperPrice } = require('../scrapers/serper');
const { sendPriceAlertEmail } = require('../utils/email');

async function fetchCurrentPrice(url) {
  if (url.includes('amazon.in')) {
    return await fetchAmazonPrice(url);
  } else {
    return await fetchSerperPrice(url);
  }
}

// PERFORMANCE FIX: Parallel Batch Processor
async function processPriceCheck(item) {
  try {
    const currentPrice = await fetchCurrentPrice(item.product_url);
    if (currentPrice === null) return;

    db.get('SELECT price FROM price_history WHERE product_url = ? ORDER BY scraped_at DESC LIMIT 1', [item.product_url], (err, row) => {
      if (err) return;
      const lastPrice = row ? row.price : null;

      if (currentPrice !== lastPrice) {
        db.run('INSERT INTO price_history (product_url, price) VALUES (?, ?)', [item.product_url, currentPrice]);
        
        if (item.target_price && currentPrice <= item.target_price) {
          db.get('SELECT email FROM users WHERE id = ?', [item.user_id], (err, user) => {
            if (user) sendPriceAlertEmail(user.email, item.product_title, currentPrice);
          });
        }
      }
    });
  } catch (err) {
    console.error(`Error checking price for ${item.product_url}:`, err.message);
  }
}

async function checkPrices() {
  db.all('SELECT * FROM watched_products', [], async (err, watched) => {
    if (err || !watched) return;
    
    console.log(`Starting scheduled price check for ${watched.length} items...`);
    
    // Process in batches of 5 to avoid overloading APIs
    const BATCH_SIZE = 5;
    for (let i = 0; i < watched.length; i += BATCH_SIZE) {
      const batch = watched.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}...`);
      await Promise.allSettled(batch.map(item => processPriceCheck(item)));
      
      // Small pause between batches for throttling
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('Price check cycle complete.');
  });
}

cron.schedule('0 */6 * * *', () => {
  checkPrices();
});

module.exports = { checkPrices };
