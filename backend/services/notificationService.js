const axios = require('axios');

class NotificationService {
  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID;
    this.apiKey = process.env.ONESIGNAL_REST_API_KEY;
    
    if (!this.appId || !this.apiKey) {
      console.warn('OneSignal: Missing App ID or API Key in environment variables.');
    } else {
      console.log('OneSignal Service Initialized');
    }
  }

  // Send notification to a specific user (via OneSignal External ID)
  async sendToUser(userId, notificationData) {
    if (!userId) {
      console.warn('OneSignal: No userId provided for notification');
      return { success: false, error: 'No userId provided' };
    }

    try {
      const payload = {
        app_id: this.appId.trim(),
        include_external_user_ids: [String(userId).trim()],
        contents: {
          en: String(notificationData.body || 'New Notification')
        },
        headings: {
          en: String(notificationData.title || 'UniVerse')
        },
        data: {
          orderId: notificationData.orderId ? String(notificationData.orderId) : '',
          type: String(notificationData.type || 'new_order'),
          url: String(notificationData.clickAction || '/vendor/dashboard')
        },
        web_url: String(notificationData.clickAction || '/vendor/dashboard'),
        chrome_web_icon: 'https://www.universeorder.co.in/icons.svg',
        chrome_web_badge: 'https://www.universeorder.co.in/favicon.svg'
      };

      // Try multiple authorization formats as requested "anyhow"
      const authFormats = [
        { name: 'Key (V2)', header: `Key ${this.apiKey.trim()}` },
        { name: 'Basic (V2)', header: `Basic ${this.apiKey.trim()}` },
        { name: 'Bearer (V2)', header: `Bearer ${this.apiKey.trim()}` },
        { name: 'Basic (Legacy)', header: `Basic 4tpe7ibemelnevdmawgph4pgb` }
      ];

      let lastError = null;
      for (const format of authFormats) {
        try {
          console.log(`Trying OneSignal ${format.name} authentication...`);
          const response = await axios.post('https://api.onesignal.com/notifications', payload, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': format.header
            }
          });
          console.log(`OneSignal ${format.name} Success:`, response.data);
          return { success: true, data: response.data };
        } catch (error) {
          lastError = error.response?.data || { message: error.message };
          console.warn(`OneSignal ${format.name} Failed:`, lastError);
          // Continue to next format
        }
      }

      console.error('All OneSignal auth formats failed.');
      return { success: false, error: lastError };
    } catch (error) {
      const errorData = error.response?.data || { message: error.message };
      console.error('OneSignal Error (Outer):', errorData);
      return { success: false, error: errorData };
    }
  }

  // Send notification to multiple users
  async sendToMultipleUsers(userIds, notificationData) {
    if (!userIds || userIds.length === 0) return false;

    try {
      const response = await axios.post('https://onesignal.com/api/v1/notifications', {
        app_id: this.appId.trim(),
        include_external_user_ids: userIds.map(id => String(id).trim()),
        contents: {
          en: String(notificationData.body)
        },
        headings: {
          en: String(notificationData.title)
        },
        data: {
          orderId: notificationData.orderId ? String(notificationData.orderId) : '',
          type: String(notificationData.type || 'new_order'),
          url: String(notificationData.clickAction || '/vendor/dashboard')
        },
        web_url: String(notificationData.clickAction || '/vendor/dashboard')
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.apiKey.trim()}`
        }
      });

      console.log('OneSignal Multi-Notification response:', response.data);
      return true;
    } catch (error) {
      console.error('Error sending OneSignal multi-notification:', error.response?.data || error.message);
      return false;
    }
  }

  // Legacy method signature maintained for compatibility, now maps to sendToUser
  async sendToDevice(userId, notificationData) {
    return this.sendToUser(userId, notificationData);
  }

  // Legacy method signature maintained for compatibility, now maps to sendToMultipleUsers
  async sendToMultipleDevices(userIds, notificationData) {
    return this.sendToMultipleUsers(userIds, notificationData);
  }

  // Send new order notification to vendor with full details
  async sendNewOrderNotification(vendorId, orderData) {
    if (!vendorId || !orderData) return { success: false, error: 'Missing vendorId or orderData' };

    try {
      // Format items list for notification body
      const itemsList = orderData.items?.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'Items details unavalaible';
      
      const notificationData = {
        title: '🍔 New Order Received!',
        body: `Order #${orderData.orderNumber} - ₹${orderData.totalAmount}\nItems: ${itemsList}\nCustomer: ${orderData.customerPhone || 'N/A'}`,
        orderId: orderData._id,
        type: 'new_order',
        clickAction: `/vendor/dashboard`
      };

      console.log(`Formatting notification for vendor ${vendorId}: Order #${orderData.orderNumber}`);
      return await this.sendToUser(vendorId, notificationData);
    } catch (err) {
      console.error('Error formatting order notification:', err);
      return { success: false, error: err.message };
    }
  }

  // Send any update to vendor with full details
  async sendOrderUpdateToVendor(vendorId, orderData, title, type = 'new_order') {
    if (!vendorId || !orderData) return { success: false, error: 'Missing vendorId or orderData' };

    try {
      const itemsList = orderData.items?.map(item => `${item.quantity}x ${item.name}`).join(', ') || 'Items details unavalaible';
      
      const notificationData = {
        title: title || '📋 Order Update',
        body: `Order #${orderData.orderNumber} - ₹${orderData.totalAmount}\nItems: ${itemsList}\nCustomer: ${orderData.customerPhone || 'N/A'}`,
        orderId: orderData._id,
        type: type,
        clickAction: `/vendor/dashboard`
      };

      console.log(`Sending update notification to vendor ${vendorId}: ${title}`);
      return await this.sendToUser(vendorId, notificationData);
    } catch (err) {
      console.error('Error sending vendor update notification:', err);
      return { success: false, error: err.message };
    }
  }

  // Send order status update notification to customer
  async sendOrderStatusUpdate(customerId, orderData, status) {
    const statusEmojis = {
      'accepted': '✅',
      'preparing': '👨‍🍳',
      'ready': '🔔',
      'completed': '🎉',
      'rejected': '❌'
    };

    const notificationData = {
      title: `${statusEmojis[status] || '📋'} Order ${status}`,
      body: `Your order #${orderData.orderNumber || orderData._id} has been ${status}`,
      orderId: orderData._id,
      type: 'order_update',
      clickAction: `/order-tracker/${orderData._id}`
    };

    return await this.sendToUser(customerId, notificationData);
  }
}

module.exports = new NotificationService();
