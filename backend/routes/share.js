const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// Helper to escape HTML characters in meta tags
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 1. Food Dish Share Controller (/d/:storeId & /api/share/dish)
const handleDishShare = async (req, res) => {
  try {
    const storeIdParam = req.params.storeId || req.query.s || req.query.storeId;
    const dishParam = req.query.dish || req.query.d || req.query.p || req.query.name;

    const defaultHost = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).host : 'uat.food.universeorder.co.in';
    const host = req.get('host') || defaultHost;
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const origin = `${proto}://${host}`;

    if (!storeIdParam) {
      return res.redirect(origin);
    }

    const cleanStoreId = String(storeIdParam).trim();

    // Look up store by full ID or 8-char prefix
    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { id: cleanStoreId },
          { id: { startsWith: cleanStoreId } }
        ]
      }
    });

    if (!store) {
      return res.redirect(origin);
    }

    // Look for matching product in store.products
    let matchedProduct = null;
    const products = Array.isArray(store.products) ? store.products : [];

    if (dishParam) {
      const cleanDish = decodeURIComponent(String(dishParam)).trim().toLowerCase();
      matchedProduct = products.find(p => {
        const pName = (p.name || '').trim().toLowerCase();
        const pId = (p.id || p._id || '').toString();
        return pName === cleanDish || pId === cleanDish || pName.includes(cleanDish);
      });
    }

    // Default to first product if not matched, or fallback to store
    if (!matchedProduct && products.length > 0) {
      matchedProduct = products[0];
    }

    let pageTitle = '';
    let ogTitle = '';
    let ogDesc = '';
    let ogImage = '';
    let targetUrl = '';

    if (matchedProduct) {
      const hasVariants = matchedProduct.variants && matchedProduct.variants.length > 0;
      const minPrice = hasVariants ? Math.min(...matchedProduct.variants.map(v => v.price)) : (matchedProduct.price || 0);

      pageTitle = `${matchedProduct.name} — ₹${minPrice} • ${store.name} | UNIVERSE`;
      ogTitle = `🔥 ${matchedProduct.name} — ₹${minPrice} • ${store.name}`;
      ogDesc = `Hungry? Fresh ${matchedProduct.name} from ${store.name} (${store.market || 'Campus'}), ready to order on UNIVERSE!`;
      // User requirement: if sharing food then food image should be shown, fallback to stall image
      ogImage = matchedProduct.image || store.image || `${origin}/favicon.png`;
      targetUrl = `${origin}/store/${store.id}?dish=${encodeURIComponent(matchedProduct.name)}`;
    } else {
      pageTitle = `${store.name} | UNIVERSE Campus Dining`;
      ogTitle = `🏪 ${store.name} • UNIVERSE Campus Dining`;
      ogDesc = `Looking for good food? Explore the live menu at ${store.name} (${store.market || 'Campus'}) on UNIVERSE!`;
      ogImage = store.image || `${origin}/favicon.png`;
      targetUrl = `${origin}/store/${store.id}`;
    }

    // Render lightweight Open Graph HTML with instant client-side redirection
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>

  <!-- Canonical and Open Graph / WhatsApp Preview Tags -->
  <link rel="canonical" href="${escapeHtml(targetUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="UniVerse Campus Dining">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDesc)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">
  <meta property="og:image:alt" content="${escapeHtml(ogTitle)}">
  <meta property="og:url" content="${escapeHtml(targetUrl)}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDesc)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <!-- Instant Browser Redirect for Humans -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(targetUrl)}">
  <script>
    window.location.replace("${escapeHtml(targetUrl)}");
  </script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
    .loader { padding: 2rem; border-radius: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
    a { color: #ef4123; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="loader">
    <h2>Opening ${escapeHtml(matchedProduct ? matchedProduct.name : store.name)} on UniVerse...</h2>
    <p>If not redirected automatically, <a href="${escapeHtml(targetUrl)}">click here to view dish</a>.</p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[ShareHandler] Error serving dish share:', err);
    res.redirect('/');
  }
};

// 2. Stall / Store Share Controller (/s/:storeId & /api/share/stall)
const handleStallShare = async (req, res) => {
  try {
    const storeIdParam = req.params.storeId || req.query.s || req.query.storeId;

    const defaultHost = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).host : 'uat.food.universeorder.co.in';
    const host = req.get('host') || defaultHost;
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const origin = `${proto}://${host}`;

    if (!storeIdParam) {
      return res.redirect(origin);
    }

    const cleanStoreId = String(storeIdParam).trim();

    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { id: cleanStoreId },
          { id: { startsWith: cleanStoreId } }
        ]
      }
    });

    if (!store) {
      return res.redirect(origin);
    }

    const productCount = Array.isArray(store.products) ? store.products.length : 0;
    const pageTitle = `${store.name} | UNIVERSE Campus Dining`;
    const ogTitle = `🏪 ${store.name} • UNIVERSE Campus Dining`;
    const ogDesc = `Looking for good food? Explore ${productCount > 0 ? `${productCount} fresh dishes` : 'the live menu'} at ${store.name} (${store.market || 'Campus'}). Ready to order on UNIVERSE!`;
    // User requirement: if sharing stall then stall image should be shown
    const ogImage = store.image || `${origin}/favicon.png`;
    const targetUrl = `${origin}/store/${store.id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>

  <link rel="canonical" href="${escapeHtml(targetUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="UniVerse Campus Dining">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDesc)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}">
  <meta property="og:image:alt" content="${escapeHtml(ogTitle)}">
  <meta property="og:url" content="${escapeHtml(targetUrl)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDesc)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <meta http-equiv="refresh" content="0;url=${escapeHtml(targetUrl)}">
  <script>
    window.location.replace("${escapeHtml(targetUrl)}");
  </script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
    .loader { padding: 2rem; border-radius: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
    a { color: #ef4123; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="loader">
    <h2>Opening ${escapeHtml(store.name)} on UniVerse...</h2>
    <p>If not redirected automatically, <a href="${escapeHtml(targetUrl)}">click here to view store</a>.</p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[ShareHandler] Error serving stall share:', err);
    res.redirect('/');
  }
};

router.get('/d/:storeId', handleDishShare);
router.get('/s/:storeId', handleStallShare);
router.get('/api/share/dish', handleDishShare);
router.get('/api/share/stall', handleStallShare);

module.exports = router;
