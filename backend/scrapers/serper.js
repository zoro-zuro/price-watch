const axios = require('axios');

/**
 * Generic Validation Logic (Permissive but secure)
 */
function isValidProduct(title, query, price) {
    if (!title) return false;
    const t = title.toLowerCase();
    const q = query.toLowerCase();
    
    // 1. Basic Check: Does it even mention the main keyword?
    const mainKeyword = q.split(' ')[0]; // e.g., "iphone"
    if (!t.includes(mainKeyword)) return false;

    // 2. Accessory Block
    const junk = ['case', 'cover', 'glass', 'cable', 'adapter', 'tempered', 'skin', 'sticker', 'pouch', 'sleeve', 'strap', 'band'];
    const isActuallyAccessory = junk.some(kw => t.includes(kw));
    const userWantedAccessory = junk.some(kw => q.includes(kw));
    
    if (isActuallyAccessory && !userWantedAccessory) return false;

    // 3. Price Guard
    const highEnd = ['iphone', 'macbook', 'laptop', 'galaxy', 'console', 'ipad', 'playstation', 'xbox'];
    if (highEnd.some(kw => q.includes(kw)) && price < 3000) return false;

    return true;
}

async function searchGoogleShopping(query, enabledStores = []) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  
  const url = 'https://google.serper.dev/shopping';
  const headers = { 'X-API-KEY': apiKey };
  const data = { q: query, gl: 'in', hl: 'en', location: 'India' };
  
  try {
    const response = await axios.post(url, data, { headers });
    if (!response.data || !response.data.shopping) return [];
    
    return response.data.shopping
      .map(item => {
        const store = (item.source || item.merchant || 'Unknown').toLowerCase();
        let price = item.price ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : 0;

        // Store Filter
        if (enabledStores.length > 0) {
          const match = enabledStores.some(s => store.includes(s.toLowerCase()));
          if (!match) return null;
        }

        // Generic Validation
        if (!isValidProduct(item.title, query, price)) return null;

        return {
          title: item.title,
          price,
          image: item.imageUrl,
          store: item.source || item.merchant,
          rating: item.rating,
          url: item.link
        };
      })
      .filter(p => p !== null);
  } catch (err) {
    return [];
  }
}

async function fetchSerperPrice(url) {
  const apiKey = process.env.SERPER_API_KEY;
  const data = { q: url };
  try {
    const response = await axios.post('https://google.serper.dev/shopping', data, { headers: { 'X-API-KEY': apiKey } });
    if (response.data && response.data.shopping && response.data.shopping.length > 0) {
      return parseFloat(response.data.shopping[0].price.replace(/[^0-9.]/g, ''));
    }
  } catch (err) {}
  return null;
}

module.exports = { searchGoogleShopping, fetchSerperPrice };
