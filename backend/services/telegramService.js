const axios = require('axios');

class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    console.log('--- Telegram Notification Service Initialized ---');
  }

  /**
   * Send a message via Telegram Bot API
   * @param {string} chatId - Recipient's Telegram Chat ID
   * @param {string} text - Message text (supports HTML)
   */
  async sendMessage(chatId, text) {
    if (!chatId || !this.token) {
      console.warn('Skipping Telegram: Missing Chat ID or Bot Token.');
      return false;
    }

    try {
      const url = `${this.apiUrl}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      });

      if (response.data.ok) {
        console.log(`✅ Telegram alert sent successfully to Chat ID: ${chatId}`);
        return true;
      } else {
        console.error('❌ Telegram API error:', response.data.description);
        return false;
      }
    } catch (err) {
      console.error('❌ Error sending Telegram message:', err.message);
      return false;
    }
  }

  /**
   * Specifically for new order alerts
   */
  async sendOrderAlert(store, order) {
    // 1. Try store-level telegram ID
    // 2. Fallback to admin-level ID (backward compatibility)
    const chatId = (store && store.telegramChatId) || (store && store.admin && store.admin.telegramChatId);

    if (!chatId) {
      console.log(`Skipping Telegram alert for Store "${store?.name}": No telegramChatId found.`);
      return;
    }
 
    const itemList = order.items?.map(item => `• ${item.name} <b>(x${item.quantity})</b>`).join('\n') || '';

    const message = `🔔 <b>UniVerse Order Alert!</b>\n\n` +
      `New Order <b>#${order.orderNumber}</b> received.\n` +
      `💰 Amount: <b>₹${order.totalAmount}</b>\n` +
      `👤 Customer: ${order.customerName || 'Customer'}\n` +
      `🏪 Store: ${store?.name || 'Your Store'}\n\n` +
      `📦 <b>Items Ordered:</b>\n${itemList}\n\n` +
      `👉 <b><a href="https://www.universeorder.co.in/vendor/dashboard">Open Dashboard</a></b>`;
 
    return this.sendMessage(chatId, message);
  }
}

const telegramService = new TelegramService();
module.exports = telegramService;
