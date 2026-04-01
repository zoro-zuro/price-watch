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

    // 2. Accessory Block (Stay strict here)
    const junk = ['case', 'cover', 'glass', 'cable', 'adapter', 'tempered', 'skin', 'sticker', 'pouch', 'sleeve', 'strap', 'band'];
    // If it's an accessory but the user didn't ASK for an accessory, block it
    const isActuallyAccessory = junk.some(kw => t.includes(kw));
    const userWantedAccessory = junk.some(kw => q.includes(kw));
    
    if (isActuallyAccessory && !userWantedAccessory) return false;

    // 3. Price Guard (Simplified)
    // If it's a known premium device but under 3000, it's almost certainly fake info
    const highEnd = ['iphone', 'macbook', 'laptop', 'galaxy', 'console', 'ipad', 'playstation', 'xbox'];
    if (highEnd.some(kw => q.includes(kw)) && price < 3000) return false;

    return true;
}

async function searchAmazon(query, enabledStores = []) {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  if (!apiKey) return [];
  
  if (enabledStores.length > 0 && !enabledStores.some(s => s.toLowerCase().includes('amazon'))) {
    return [];
  }

  const url = `https://api.scrapingdog.com/amazon?api_key=${apiKey}&domain=in&type=search&query=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(url);
    if (!response.data || !Array.isArray(response.data)) return [];
    
    return response.data
      .map(item => {
        let price = item.price ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : 0;
        if (!isValidProduct(item.title, query, price)) return null;

        return {
          title: item.title,
          price,
          image: item.image,
          store: 'Amazon',
          rating: item.rating,
          url: item.url
        };
      })
      .filter(p => p !== null);
  } catch (err) { return []; }
}

async function fetchAmazonPrice(url) {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  const directUrl = `https://api.scrapingdog.com/amazon?api_key=${apiKey}&domain=in&type=product&url=${encodeURIComponent(url)}`;
  try {
    const response = await axios.get(directUrl);
    if (response.data && response.data.price) {
      return parseFloat(response.data.price.replace(/[^0-9.]/g, ''));
    }
  } catch (err) {}
  return null;
}

module.exports = { searchAmazon, fetchAmazonPrice };
