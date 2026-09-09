/**
 * TelegramService - Disabled
 * Switched entirely to Mobile App Push Notifications & WhatsApp Engine.
 */
class TelegramService {
  constructor() {
    // Disabled as requested: platform shifted to Mobile App & WhatsApp
  }

  async sendMessage() {
    return false;
  }

  async sendOrderAlert() {
    return false;
  }

  async sendPreOrderReminder() {
    return false;
  }

  async sendPreOrder15MinReminder() {
    return false;
  }

  async sendPreOrderFinalAlert() {
    return false;
  }

  async sendStatusAlert() {
    return false;
  }
}

const telegramService = new TelegramService();
module.exports = telegramService;
