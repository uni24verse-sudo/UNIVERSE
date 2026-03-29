const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.status = 'ready'; // CallMeBot is always ready as it's a REST API
    console.log('--- WhatsApp Service: CallMeBot Integration Active ---');
  }

  /**
   * Send a message via CallMeBot API
   * @param {string} number - Destination phone number (e.g. 919876543210)
   * @param {string} apiKey - Vendor's CallMeBot API Key
   * @param {string} message - Message text
   */
  async sendMessage(number, apiKey, message) {
    if (!apiKey) {
      console.warn('Skipping WhatsApp: No API Key provided for number', number);
      return false;
    }

    try {
      // Sanitize number: Remove non-numeric characters and ensure it has 91 prefix for India if 10 digits
      let cleanNumber = number.replace(/\D/g, '');
      if (cleanNumber.length === 10) {
        cleanNumber = '91' + cleanNumber;
      }

      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      
      // CallMeBot Endpoint
      const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanNumber}&text=${encodedMessage}&apikey=${apiKey}`;
      
      console.log(`Forwarding WhatsApp alert to CallMeBot for ${cleanNumber}...`);
      
      const response = await axios.get(url);
      
      if (response.status === 200) {
        console.log(`✅ WhatsApp message sent successfully via CallMeBot to ${cleanNumber}`);
        return true;
      } else {
        console.error('❌ CallMeBot returned non-200 status:', response.status);
        return false;
      }
    } catch (err) {
      console.error('❌ Error sending WhatsApp via CallMeBot:', err.message);
      return false;
    }
  }

  /**
   * Specific helper for order alerts
   */
  async sendOrderAlert(admin, order) {
    if (!admin.whatsappNumber || !admin.whatsappApiKey) {
      console.log('Skipping WhatsApp alert: Missing number or API key for vendor.');
      return;
    }

    const itemList = order.items?.map(item => `• ${item.name} *(x${item.quantity})*`).join('\n') || 'No items listed';

    const message = `🔔 *UniVerse Order Alert!*\n\n` +
      `New Order *#${order.orderNumber}* received.\n` +
      `💰 Amount: ₹${order.totalAmount}\n` +
      `👤 Customer: ${order.customerName || 'Customer'}\n` +
      `🏪 Store: ${order.store?.name || 'Your Store'}\n\n` +
      `📦 *Items Ordered:*\n${itemList}\n\n` +
      `👉 View: https://www.universeorder.co.in/vendor/dashboard`;

    return this.sendMessage(admin.whatsappNumber, admin.whatsappApiKey, message);
  }

  // Mock getStatus for dashboard compatibility
  getStatus() {
    return {
      status: 'connected', // Always show connected for CallMeBot
      qrCode: null
    };
  }
  
  // Mock start for dashboard compatibility
  async start() {
    console.log('CallMeBot service is always active. No browser needed.');
    return true;
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
