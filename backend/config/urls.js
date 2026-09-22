/**
 * Central URL resolver for UniVerse
 * Guarantees that production environments NEVER send UAT links,
 * while allowing UAT / staging to use its designated domain.
 */
function getFrontendUrl() {
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim() !== '') {
    return process.env.FRONTEND_URL.trim().replace(/\/+$/, '');
  }
  
  if (process.env.APP_ENV === 'uat' || process.env.NODE_ENV === 'uat') {
    return 'https://uat.food.universeorder.co.in';
  }
  
  // Default to live Production domain
  return 'https://food.universeorder.co.in';
}

module.exports = { getFrontendUrl };
