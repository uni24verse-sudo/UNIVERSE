const axios = require('axios');

class NotificationService {
  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID || "cec6a596-a353-47ac-af3b-f007f5ceeb54";
    this.apiKey = process.env.ONESIGNAL_REST_API_KEY || "os_v2_app_z3dklfvdknd2zlz36ad7ltxlksbjnukozmzu74ft3laggyikge7uogijxiofoo7m7owxcrwbgqtclhsnro2m7f66pyhjou2l2dlzrti";
  }

  // Send notification to a specific user (via OneSignal External ID)
  async sendToUser(userId, notificationData) {
    if (!userId) {
      console.warn('OneSignal: No userId provided for notification');
      return false;
    }

    try {
      const payload = {
        app_id: this.appId,
        include_external_user_ids: [String(userId)],
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

      console.log('Sending OneSignal Notification to External ID:', userId);
      
      const response = await axios.post('https://onesignal.com/api/v1/notifications', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${this.apiKey}`
        }
      });

      console.log('OneSignal API Success:', response.data);
      return true;
    } catch (error) {
      const errorData = error.response?.data;
      console.error('OneSignal API Error:', {
        status: error.response?.status,
        data: errorData,
        message: error.message
      });
      return false;
    }
  }

  // Send notification to multiple users
  async sendToMultipleUsers(userIds, notificationData) {
    if (!userIds || userIds.length === 0) return false;

    try {
      const response = await axios.post('https://onesignal.com/api/v1/notifications', {
        app_id: this.appId,
        include_external_user_ids: userIds.map(id => String(id)),
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
          'Authorization': `Key ${this.apiKey}`
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

  // Send new order notification to vendor
  async sendNewOrderNotification(vendorId, orderData) {
    const notificationData = {
      title: '🍔 New Order Received!',
      body: `Order #${orderData.orderNumber || orderData._id} - ₹${orderData.totalAmount}`,
      orderId: orderData._id,
      type: 'new_order',
      clickAction: `/vendor/dashboard`
    };

    return await this.sendToUser(vendorId, notificationData);
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
