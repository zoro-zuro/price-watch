require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const db = require('./backend/db');
const { checkPrices } = require('./backend/cron/price-check'); // Ensure it starts

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Routes
const authRoutes = require('./backend/routes/auth');
const searchRoutes = require('./backend/routes/search');
const watchRoutes = require('./backend/routes/watch');
const historyRoutes = require('./backend/routes/history');
const detailsRoutes = require('./backend/routes/details');

app.use('/api', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api', watchRoutes);
app.use('/api/price-history', historyRoutes);
app.use('/api/product-details', detailsRoutes);

// API route test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server running on ${url}`);
  
  // Automate opening the browser
  const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
  exec(`${start} ${url}`);
});
