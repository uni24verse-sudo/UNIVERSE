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
  async sendMessage(chatId, text, tokenOverride = null) {
    const finalToken = tokenOverride || this.token;
    const finalApiUrl = tokenOverride ? `https://api.telegram.org/bot${tokenOverride}` : this.apiUrl;

    if (!chatId || !finalToken) {
      console.warn('Skipping Telegram: Missing Chat ID or Bot Token.');
      return false;
    }

    try {
      const url = `${finalApiUrl}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_notification: false
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
 
    const itemList = order.items?.map(item => {
      let text = `• ${item.name} <b>(x${item.quantity})</b>`;
      if (item.isCombo) {
        if (item.comboItems?.length > 0) {
          text += item.comboItems.map(ci => `\n  - ${ci.quantity} ${ci.name}`).join('');
        }
        if (item.freeItems?.length > 0) {
          text += item.freeItems.map(fi => `\n  + Free ${fi.quantity} ${fi.name}`).join('');
        }
      }
      return text;
    }).join('\n') || '';

    const orderTypeEmoji = order.orderType === 'Take Away' ? '🛍️' : '🍽️';
    const orderTypeLabel = order.orderType || 'Dine In';

    const message = `🔔 <b>UniVerse Order Alert!</b>\n\n` +
      `New Order <b>#${order.orderNumber}</b> received.\n\n` +
      `${orderTypeEmoji} <b>Order Type: ${orderTypeLabel}</b>\n\n` +
      `📦 <b>Items Ordered:</b>\n${itemList}\n\n` +
      `💰 Amount: <b>₹${order.totalAmount}</b>\n` +
      `🏪 Store: ${store?.name || 'Your Store'}\n\n` +
      `👉 <b><a href="https://www.universeorder.co.in/vendor/dashboard">Open Dashboard</a></b>`;
    const botToken = store?.telegramBotToken || null;
 
    return this.sendMessage(chatId, message, botToken);
  }
}

const telegramService = new TelegramService();
module.exports = telegramService;
