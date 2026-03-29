const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

class WhatsAppService {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '../.wwebjs_auth')
      }),
      puppeteer: {
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions'],
      }
    });

    this.qrCode = null;
    this.status = 'initializing'; // initializing, qr_ready, connected, disconnected

    console.log('--- WhatsApp Service Initializing... ---');
    this.initialize();
  }

  initialize() {
    console.log('Attempting to initialize WhatsApp client...');
    this.client.on('qr', (qr) => {
      console.log('WhatsApp QR Code received by service. Converting to DataURL...');
      // Generate a Data URL for the QR code so it can be easily displayed in the frontend
      qrcode.toDataURL(qr, (err, url) => {
        if (!err) {
          this.qrCode = url;
          this.status = 'qr_ready';
          console.log('✅ WhatsApp QR Code generated successfully. Scan it from the dashboard.');
        } else {
          console.error('❌ Error generating QR DataURL:', err);
        }
      });
    });

    this.client.on('ready', () => {
      this.status = 'connected';
      this.qrCode = null;
      console.log('🚀 SUCCESS: WhatsApp Client is ready and connected!');
    });

    this.client.on('authenticated', () => {
      console.log('🔑 WhatsApp Authenticated successfully.');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'disconnected';
      console.error('❌ WhatsApp Auth failure:', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      console.log('⚠️ WhatsApp disconnected (Reason):', reason);
      // Try to re-initialize
      console.log('Re-initializing WhatsApp client...');
      this.client.initialize();
    });

    this.client.initialize().then(() => {
      console.log('initialization process started...');
    }).catch(err => {
      console.error('❌ CRITICAL: Failed to initialize WhatsApp client:', err.message);
    });
  }

  getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCode
    };
  }

  async sendMessage(number, message) {
    if (this.status !== 'connected') {
      console.warn('WhatsApp not connected. Cannot send message.');
      return false;
    }

    try {
      // Sanitize number: Remove non-numeric characters and ensure it has 91 prefix for India
      let cleanNumber = number.replace(/\D/g, '');
      if (cleanNumber.length === 10) {
        cleanNumber = '91' + cleanNumber;
      }
      
      const chatId = cleanNumber + '@c.us';
      await this.client.sendMessage(chatId, message);
      console.log(`WhatsApp message sent to ${cleanNumber}`);
      return true;
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      return false;
    }
  }

  async sendOrderAlert(admin, order) {
    if (!admin.whatsappNumber) return;

    const message = `🔔 *UniVerse Order Alert!*\n\n` +
      `New Order *#${order.orderNumber}* has been received.\n` +
      `💰 Amount: ₹${order.totalAmount}\n` +
      `👤 Customer: ${order.customerName || 'Customer'}\n` +
      `🏪 Store: ${order.store?.name || 'Your Store'}\n\n` +
      `👉 View and manage directly on your dashboard: https://universeorder.co.in/vendor/dashboard`;

    return this.sendMessage(admin.whatsappNumber, message);
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();
module.exports = whatsappService;
