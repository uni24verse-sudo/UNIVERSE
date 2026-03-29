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
        headless: true,
        handleSIGINT: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', 
          '--disable-gpu'
        ],
      }
    });

    this.qrCode = null;
    this.status = 'disconnected'; // disconnected, initializing, qr_ready, connected

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.client.on('qr', (qr) => {
      qrcode.toDataURL(qr, (err, url) => {
        if (!err) {
          this.qrCode = url;
          this.status = 'qr_ready';
          console.log('✅ WhatsApp QR Code generated and shared for scanning.');
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
    });
  }

  async start() {
    if (this.status === 'connected' || this.status === 'initializing' || this.status === 'qr_ready') {
      console.log(`WhatsApp already in state: ${this.status}. Skipping initialization.`);
      return;
    }

    console.log('--- WhatsApp Service: Manual Start Triggered ---');
    this.status = 'initializing';
    
    try {
      console.log('Launching Puppeteer browser...');
      await this.client.initialize();
      console.log('WhatsApp initialization command sent to client.');
    } catch (err) {
      this.status = 'disconnected';
      console.error('❌ CRITICAL: Failed to start WhatsApp client:', err.message);
      throw err;
    }
  }

  getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCode
    };
  }

  async sendMessage(number, message) {
    if (this.status !== 'connected') {
      console.warn('WhatsApp not connected. Cannot send message to:', number);
      return false;
    }

    try {
      let cleanNumber = number.replace(/\D/g, '');
      if (cleanNumber.length === 10) {
        cleanNumber = '91' + cleanNumber;
      }
      
      const chatId = cleanNumber + '@c.us';
      await this.client.sendMessage(chatId, message);
      console.log(`WhatsApp message sent successfully to ${cleanNumber}`);
      return true;
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      return false;
    }
  }

  async sendOrderAlert(admin, order) {
    if (!admin.whatsappNumber) {
      console.log('Skipping WhatsApp alert: No whatsappNumber for admin.');
      return;
    }

    const message = `🔔 *UniVerse Order Alert!*\n\n` +
      `New Order *#${order.orderNumber}* has been received.\n` +
      `💰 Amount: ₹${order.totalAmount}\n` +
      `👤 Customer: ${order.customerName || 'Customer'}\n` +
      `🏪 Store: ${order.store?.name || 'Your Store'}\n\n` +
      `👉 Manage here: https://www.universeorder.co.in/vendor/dashboard`;

    return this.sendMessage(admin.whatsappNumber, message);
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
