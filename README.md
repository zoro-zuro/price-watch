# PriceWatch - Price Tracker & Comparison Site

A full-stack web application to search products across Amazon and Flipkart (via Scrapingdog and Serper APIs), track price history, and set email alerts for price drops.

## Tech Stack
- **Backend:** Node.js, Express, better-sqlite3 (SQLite)
- **Frontend:** Vanilla HTML, CSS (Claude-inspired minimalist design), JavaScript
- **Background Tasks:** `node-cron`
- **Charts:** Chart.js

## Features
- **Authentication:** JWT-based login and registration.
- **Search:** Combined results from Amazon (Scrapingdog) and Google Shopping (Serper).
- **Watchlist:** Save products to your account and track updated prices.
- **Price History:** View price fluctuations over time in a beautiful line chart.
- **Price Alerts:** Set a target price and receive an email via Nodemailer when the price drops.

## Setup Instructions

1.  **Environment Variables:**
    - Copy `.env.template` to `.env`.
    - Fill in your API keys for Scrapingdog and Serper.
    - Add your SMTP credentials for email alerts.

    ```bash
    cp .env.template .env
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run the Application:**
    - For development:
      ```bash
      npm run dev
      ```
    - For production:
      ```bash
      npm start
      ```
    The app will be available at `http://localhost:3000`.

## Directory Structure
- `backend/`: API routes, scrapers, and database logic.
- `frontend/`: Static assets (HTML, CSS, JS).
- `server.js`: Main entry point.
- `database.sqlite`: SQLite database file (created on first run).
