# `plan.md` – Price Tracker & Comparison Site

## 1. Overview
A web app that lets users search for products across Amazon/Flipkart, compare prices, and set price drop alerts. Users can create accounts to save products and receive email notifications when the price hits their target. All data is fetched in real‑time via Scrapingdog and Serper APIs, with no permanent product database.

**Core Features**
- Search products via keyword (e.g., "iphone") → show results from Amazon, Flipkart, etc.
- Click on product → see details, price, ratings, and a "Watch" button to save it.
- Login system (email/password) to manage watched products and price alerts.
- Price alert: user sets a target price → background cron job checks every 6 hours → email sent when price drops below target.
- Price history chart (simple line chart) built from data collected since the product was first watched.

## 2. Tech Stack
- **Frontend:** HTML, CSS, vanilla JavaScript (no frameworks)
- **Backend:** Node.js + Express
- **Database:** SQLite (`better-sqlite3`)
- **Cron:** `node-cron`
- **Email:** `nodemailer` (Gmail SMTP or any SMTP)
- **External APIs:**
  - Scrapingdog (Amazon scraping) – 1000 free credits
  - Serper (Google Shopping) – 2500 free queries
- **Authentication:** Simple JWT or session‑based (we'll use JWT for simplicity)

## 3. Architecture Flow

```
User searches “iphone”
    ↓
Frontend sends GET /api/search?q=iphone
    ↓
Backend:
  - Try Scrapingdog first (Amazon.in)
  - If fails or for Flipkart/Croma, fallback to Serper (Google Shopping)
  - Combine & deduplicate results
    ↓
Return JSON array of products: { id, title, price, image, store, rating, url }
    ↓
Frontend renders cards

User clicks “Watch” on a product
    ↓
(Requires login) POST /api/watch
    ↓
Backend saves to watched_products table with optional target_price
    ↓
Cron job (every 6 hours):
  - Fetch all watched products
  - For each, fetch current price (via Scrapingdog or Serper using the product URL)
  - If changed, save new entry in price_history table
  - If current_price <= target_price → send email via nodemailer
```

## 4. Database Schema (SQLite)

```sql
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Watched products (one per user)
CREATE TABLE watched_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_title TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_image TEXT,
  store TEXT,
  target_price REAL,                -- optional alert threshold
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Price history (built forward)
CREATE TABLE price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_url TEXT NOT NULL,
  price REAL NOT NULL,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Notes**
- `product_url` is the unique identifier for a product across stores. We use it to link watched products to price history.
- No need to store product details in a separate table; we fetch fresh data when needed.

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Create account |
| POST | /api/login | Login → returns JWT |
| GET | /api/search?q=keyword | Search products |
| POST | /api/watch | Add product to watchlist (requires auth) |
| GET | /api/watched | List user's watched products (with current price) |
| DELETE | /api/watch/:id | Remove watched product |
| GET | /api/price-history?url=xxx | Get price history for a product (chart data) |
| POST | /api/alert/:id | Set/update target price for a watched product |

## 6. Folder Structure

```
project-root/
├── backend/
│   ├── server.js                 # Express entry point
│   ├── db.js                     # SQLite connection & setup
│   ├── auth.js                   # JWT middleware
│   ├── routes/
│   │   ├── auth.js               # register/login
│   │   ├── search.js             # /api/search
│   │   ├── watch.js              # /api/watch, /api/watched, /api/alert/:id
│   │   └── history.js            # /api/price-history
│   ├── scrapers/
│   │   ├── scrapingdog.js        # fetch from Amazon using Scrapingdog
│   │   └── serper.js             # fetch from Google Shopping
│   ├── cron/
│   │   └── price-check.js        # scheduled job (runs every 6h)
│   ├── utils/
│   │   ├── email.js              # nodemailer config
│   │   └── helpers.js            # common functions
│   └── .env                      # environment variables
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js                    # main frontend logic
│   └── (other static files)
└── plan.md                       # this file
```

## 7. Build Order (Step‑by‑Step)

1. **Set up Node.js backend skeleton**
   - `npm init`, install `express`, `better-sqlite3`, `dotenv`, `jsonwebtoken`, `bcrypt`, `node-cron`, `nodemailer`, `axios`, `cors`
   - Create `server.js`, `db.js`, `.env` template

2. **Initialize SQLite database**
   - Run setup script to create tables

3. **Implement authentication routes**
   - `/api/register`, `/api/login` with JWT

4. **Integrate Scrapingdog API**
   - Write `scrapingdog.js` that calls Scrapingdog with `domain=in` and returns structured products
   - Test with “iphone”

5. **Integrate Serper API (fallback)**
   - Write `serper.js` that calls Serper Google Shopping
   - Merge with Scrapingdog results

6. **Create search endpoint `/api/search`**
   - Use both scrapers, deduplicate by title (simple heuristic)

7. **Build watchlist functionality**
   - Add watched product to DB (requires user ID)
   - Endpoint to list watched products with current price (call fresh scrape using the stored URL)

8. **Create price history table and endpoint**
   - When a watched product’s price changes (cron), insert into `price_history`
   - `/api/price-history?url=xxx` returns JSON for chart

9. **Implement cron job (`price-check.js`)**
   - Runs every 6 hours, iterates over `watched_products`, fetches current price (use the same scrapers with the product URL), compares with last recorded price in `price_history`, saves new entry if changed, sends email if below target

10. **Add email notification**
    - Use nodemailer to send email when price drop alert triggers

11. **Frontend: basic HTML/CSS layout**
    - Login/register forms, search bar, product cards, watchlist page, price history chart (Chart.js)

12. **Connect frontend to backend**
    - Use fetch with JWT stored in localStorage

13. **Test and refine**

## 8. Implementation Details (Code Snippets)

### 8.1 Scrapingdog Wrapper

```javascript
// backend/scrapers/scrapingdog.js
const axios = require('axios');

async function searchAmazon(query) {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  const url = `https://api.scrapingdog.com/amazon?api_key=${apiKey}&domain=in&type=search&query=${encodeURIComponent(query)}`;
  const response = await axios.get(url);
  // Parse response (Scrapingdog returns array of products)
  return response.data.map(item => ({
    title: item.title,
    price: parseFloat(item.price.replace(/[^0-9.]/g, '')),
    image: item.image,
    store: 'Amazon',
    rating: item.rating,
    url: item.url
  }));
}

module.exports = { searchAmazon };
```

### 8.2 Serper Wrapper

```javascript
// backend/scrapers/serper.js
const axios = require('axios');

async function searchGoogleShopping(query) {
  const apiKey = process.env.SERPER_API_KEY;
  const url = 'https://google.serper.dev/shopping';
  const headers = { 'X-API-KEY': apiKey };
  const data = { q: query };
  const response = await axios.post(url, data, { headers });
  // response.data.shopping contains items
  return response.data.shopping.map(item => ({
    title: item.title,
    price: parseFloat(item.price.replace(/[^0-9.]/g, '')),
    image: item.imageUrl,
    store: item.source || item.merchant,
    rating: item.rating,
    url: item.link
  }));
}

module.exports = { searchGoogleShopping };
```

### 8.3 Cron Job (Simplified)

```javascript
// backend/cron/price-check.js
const cron = require('node-cron');
const db = require('../db');
const { searchAmazon } = require('../scrapers/scrapingdog'); // we need a function that can fetch by URL, not by search. For simplicity, we can reuse search but better to have a direct price fetch. For now, assume we have a fetchPriceFromUrl function.

async function checkPrices() {
  const watched = db.prepare('SELECT * FROM watched_products').all();
  for (const item of watched) {
    const currentPrice = await fetchPriceFromUrl(item.product_url);
    const lastPriceRow = db.prepare('SELECT price FROM price_history WHERE product_url = ? ORDER BY scraped_at DESC LIMIT 1').get(item.product_url);
    const lastPrice = lastPriceRow ? lastPriceRow.price : null;

    if (currentPrice !== lastPrice) {
      db.prepare('INSERT INTO price_history (product_url, price) VALUES (?, ?)').run(item.product_url, currentPrice);
      if (item.target_price && currentPrice <= item.target_price) {
        // send email
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(item.user_id);
        sendPriceAlertEmail(user.email, item.product_title, currentPrice);
      }
    }
  }
}

// Schedule every 6 hours
cron.schedule('0 */6 * * *', () => {
  checkPrices();
});
```