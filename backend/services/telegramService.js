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

    let message = '';
    
    if (order.isPreOrder) {
      message = 
        `📅 <b>PRE-ORDER RECEIVED</b>\n` +
        `🕒 <b>PICKUP: ${order.scheduledTime}</b>\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `New Order <b>#${order.orderNumber}</b>\n\n` +
        `${orderTypeEmoji} <b>Type: ${orderTypeLabel}</b>\n` +
        `📦 <b>Items:</b>\n${itemList}\n\n` +
        `💰 Amount: <b>₹${order.totalAmount}</b>\n` +
        `🏪 Store: ${store?.name || 'Your Store'}\n\n` +
        `👉 <b><a href="https://www.universeorder.co.in/vendor/dashboard">Open Dashboard</a></b>`;
    } else {
      message = `🔔 <b>UniVerse Order Alert!</b>\n\n` +
        `New Order <b>#${order.orderNumber}</b> received.\n\n` +
        `${orderTypeEmoji} <b>Order Type: ${orderTypeLabel}</b>\n\n` +
        `📦 <b>Items Ordered:</b>\n${itemList}\n\n` +
        `💰 Amount: <b>₹${order.totalAmount}</b>\n` +
        `🏪 Store: ${store?.name || 'Your Store'}\n\n` +
        `👉 <b><a href="https://www.universeorder.co.in/vendor/dashboard">Open Dashboard</a></b>`;
    }

    const botToken = store?.telegramBotToken || null;
    return this.sendMessage(chatId, message, botToken);
  }

  /**
   * Specifically for pre-order reminders (30 mins before)
   */
  async sendPreOrderReminder(store, order) {
    const chatId = (store && store.telegramChatId) || (store && store.admin && store.admin.telegramChatId);
    if (!chatId) return;

    const itemList = order.items?.map(item => {
      let text = `• ${item.name} <b>(x${item.quantity})</b>`;
      if (item.isCombo && item.comboItems?.length > 0) {
        text += item.comboItems.map(ci => `\n  - ${ci.quantity} ${ci.name}`).join('');
      }
      return text;
    }).join('\n') || '';

    const message = 
      `     ⏰ <b>PRE-ORDER REMINDER</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🕒 <b>PICKUP IN: 30 MINUTES</b>\n` +
      `🕘 <b>TARGET TIME: ${order.scheduledTime}</b>\n\n` +
      `📍 <b>Order #${order.orderNumber} Items:</b>\n` +
      `${itemList}\n\n` +
      `👉 <i>Vendor, please start preparation to ensure on-time handover!</i>\n\n` +
      `🏪 Store: ${store?.name || 'Your Store'}\n` +
      `👉 <b><a href="https://www.universeorder.co.in/vendor/dashboard">Open Dashboard</a></b>`;

    const botToken = store?.telegramBotToken || null;
    return this.sendMessage(chatId, message, botToken);
  }

  /**
   * Specifically for pre-order 15-min reminders
   */
  async sendPreOrder15MinReminder(store, order) {
    const chatId = (store && store.telegramChatId) || (store && store.admin && store.admin.telegramChatId);
    if (!chatId) return;

    const itemList = order.items?.map(item => {
      let text = `• ${item.name} <b>(x${item.quantity})</b>`;
      if (item.isCombo && item.comboItems?.length > 0) {
        text += item.comboItems.map(ci => `\n  - ${ci.quantity} ${ci.name}`).join('');
      }
      return text;
    }).join('\n') || '';

    const message = 
      `     ⏰ <b>PRE-ORDER REMINDER</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🕒 <b>PICKUP IN: 15 MINUTES</b>\n` +
      `🕘 <b>TARGET TIME: ${order.scheduledTime}</b>\n\n` +
      `📍 <b>Order #${order.orderNumber} Items:</b>\n` +
      `${itemList}\n\n` +
      `👉 <i>Kitchen, please ensure the order is ready for handover in 15 mins!</i>\n\n` +
      `🏪 Store: ${store?.name || 'Your Store'}\n` +
      `👉 <b><a href="https://www.universeorder.co.in/vendor/dashboard">Open Dashboard</a></b>`;

    const botToken = store?.telegramBotToken || null;
    return this.sendMessage(chatId, message, botToken);
  }

  /**
   * Specifically for pre-order final warnings (10 mins before)
   */
  async sendPreOrderFinalAlert(store, order) {
    const chatId = (store && store.telegramChatId) || (store && store.admin && store.admin.telegramChatId);
    if (!chatId) return;

    const message = 
      `     🚨 <b>FINAL WARNING</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🕒 <b>PICKUP IN: 10 MINUTES</b>\n` +
      `🕘 <b>TARGET TIME: ${order.scheduledTime}</b>\n\n` +
      `📍 <b>Order #${order.orderNumber}</b>\n` +
      `👉 <i>Kitchen, finalize the order immediately! Customer will arrive shortly.</i>\n\n` +
      `🏪 Store: ${store?.name || 'Your Store'}\n` +
      `👉 <b><a href="https://www.universeorder.co.in/vendor/dashboard">Open Dashboard</a></b>`;
    const botToken = store?.telegramBotToken || null;
    return this.sendMessage(chatId, message, botToken);
  }

  /**
   * Specifically for store status alerts (Open/Closed)
   */
  async sendStatusAlert(store, isOpen) {
    const chatId = (store && store.telegramChatId) || (store && store.admin && store.admin.telegramChatId);
    if (!chatId) return;

    const statusEmoji = isOpen ? '🟢' : '🔴';
    const statusText = isOpen ? 'OPEN' : 'CLOSED';
    
    const message = 
      `${statusEmoji} <b>STALL STATUS UPDATE</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Your stall <b>"${store.name}"</b> is now <b>${statusText}</b>.\n\n` +
      `👉 <b><a href="https://www.universeorder.co.in/vendor/dashboard">Open Dashboard</a></b>`;

    const botToken = store.telegramBotToken || null;
    return this.sendMessage(chatId, message, botToken);
  }
}

const telegramService = new TelegramService();
module.exports = telegramService;
