const admin = require('../config/firebase');

class NotificationService {
  constructor() {
    this.isInitialized = admin.apps.length > 0;
  }

  // Send notification to a specific device
  async sendToDevice(fcmToken, notificationData) {
    if (!this.isInitialized) {
      console.warn('Firebase Admin not initialized. Cannot send notification.');
      return false;
    }

    try {
      const message = {
        token: fcmToken,
        data: {
          title: String(notificationData.title),
          body: String(notificationData.body),
          orderId: notificationData.orderId ? String(notificationData.orderId) : '',
          type: String(notificationData.type || 'new_order'),
          url: String(notificationData.clickAction || '/vendor/dashboard'),
          click_action: String(notificationData.clickAction || '/vendor/dashboard')
        },
        webpush: {
          headers: {
            Urgency: 'high'
          }
        },
        android: {
          priority: 'high'
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
      return true;
    } catch (error) {
      console.error('Error sending FCM notification:', error);
      
      // Handle specific error cases
      if (error.code === 'messaging/registration-token-not-registered') {
        console.log('Token is no longer valid, should be removed from database');
        return { error: 'token_invalid', token: fcmToken };
      } else if (error.code === 'messaging/invalid-registration-token') {
        console.log('Invalid token format');
        return { error: 'token_invalid', token: fcmToken };
      }
      
      return false;
    }
  }

  // Send notification to multiple devices
  async sendToMultipleDevices(fcmTokens, notificationData) {
    if (!this.isInitialized) {
      console.warn('Firebase Admin not initialized. Cannot send notifications.');
      return false;
    }

    const results = [];
    
    for (const token of fcmTokens) {
      const result = await this.sendToDevice(token, notificationData);
      results.push({ token, result });
    }

    return results;
  }

  // Send new order notification to vendor
  async sendNewOrderNotification(vendorFCMToken, orderData) {
    const notificationData = {
      title: '🍔 New Order Received!',
      body: `Order #${orderData.orderNumber || orderData._id} - ₹${orderData.totalAmount}`,
      orderId: orderData._id,
      type: 'new_order',
      clickAction: `/vendor/orders/${orderData._id}`
    };

    return await this.sendToDevice(vendorFCMToken, notificationData);
  }

  // Send order status update notification to customer
  async sendOrderStatusUpdate(customerFCMToken, orderData, status) {
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

    return await this.sendToDevice(customerFCMToken, notificationData);
  }

  // Subscribe to topic
  async subscribeToTopic(fcmToken, topic) {
    if (!this.isInitialized) {
      console.warn('Firebase Admin not initialized. Cannot subscribe to topic.');
      return false;
    }

    try {
      const response = await admin.messaging().subscribeToTopic([fcmToken], topic);
      console.log(`Successfully subscribed to topic: ${topic}`, response);
      return true;
    } catch (error) {
      console.error('Error subscribing to topic:', error);
      return false;
    }
  }

  // Send to topic
  async sendToTopic(topic, notificationData) {
    if (!this.isInitialized) {
      console.warn('Firebase Admin not initialized. Cannot send to topic.');
      return false;
    }

    try {
      const message = {
        topic: topic,
        data: {
          title: String(notificationData.title),
          body: String(notificationData.body),
          type: String(notificationData.type || 'general')
        },
        webpush: {
          notification: {
            icon: 'https://www.universeorder.co.in/icons.svg',
            badge: 'https://www.universeorder.co.in/favicon.svg'
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent message to topic:', response);
      return true;
    } catch (error) {
      console.error('Error sending message to topic:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();
