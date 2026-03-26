import { initializeFCM, onForegroundMessage } from '../firebase.js';

class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.swRegistration = null;
    this.audio = null;
    this.fcmToken = null;
    this.isFCMInitialized = false;
  }

  async initialize() {
    try {
      // Initialize FCM first
      await this.initializeFCMService();
      
      // Register service worker for fallback notifications
      if ('serviceWorker' in navigator) {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      }

      // Create notification sound
      this.createNotificationSound();

      return this.permission === 'granted';
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async initializeFCMService() {
    try {
      // Initialize FCM and get token
      this.fcmToken = await initializeFCM();
      
      if (this.fcmToken) {
        console.log('FCM initialized successfully with token:', this.fcmToken.substring(0, 20) + '...');
        
        // Set up foreground message handler
        onForegroundMessage();
        
        // Save token to server (you should implement this API endpoint)
        await this.saveFCMTokenToServer(this.fcmToken);
        
        this.isFCMInitialized = true;
        return true;
      } else {
        console.warn('FCM initialization failed');
        return false;
      }
    } catch (error) {
      console.error('FCM initialization error:', error);
      return false;
    }
  }

  async saveFCMTokenToServer(token) {
    try {
      // Get current user info (you may need to adjust this based on your auth system)
      const user = JSON.parse(localStorage.getItem('vendor') || '{}');
      
      if (user._id) {
        const response = await fetch('/api/save-fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            token: token,
            userId: user._id,
            userType: 'vendor'
          })
        });
        
        if (response.ok) {
          console.log('FCM token saved to server');
        } else {
          console.warn('Failed to save FCM token to server');
        }
      }
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  createNotificationSound() {
    // Create a simple notification sound using Web Audio API
    this.audio = new Audio();
    this.audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
  }

  async showNotification(title, options = {}) {
    // This method is now mainly for fallback notifications
    // FCM handles most notifications automatically
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      // Play notification sound
      this.playNotificationSound();

      // Show browser notification (fallback)
      if (this.swRegistration) {
        await this.swRegistration.showNotification(title, {
          icon: '/icons.svg',
          badge: '/favicon.svg',
          vibrate: [100, 50, 100],
          requireInteraction: true,
          ...options
        });
      } else {
        // Fallback to basic notification
        new Notification(title, {
          icon: '/icons.svg',
          badge: '/favicon.svg',
          requireInteraction: true,
          ...options
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  playNotificationSound() {
    if (this.audio) {
      this.audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    }
  }

  // This method is now deprecated - use FCM instead
  async showOrderNotification(orderData) {
    console.warn('showOrderNotification is deprecated. Use FCM push notifications instead.');
    
    if (!this.isFCMInitialized) {
      // Fallback to basic notification if FCM is not available
      const { orderId, customerName, totalAmount, items } = orderData;
      
      const title = '🍔 New Order Received!';
      const body = `Order #${orderId} - ${customerName}\nAmount: ₹${totalAmount}\nItems: ${items?.length || 0} items`;

      return this.showNotification(title, {
        body,
        data: { orderId, type: 'new_order' },
        actions: [
          {
            action: 'accept',
            title: '✅ Accept',
            icon: '/icons.svg'
          },
          {
            action: 'reject',
            title: '❌ Reject',
            icon: '/icons.svg'
          },
          {
            action: 'view',
            title: '👁️ View',
            icon: '/icons.svg'
          }
        ],
        tag: `order-${orderId}`,
        renotify: true
      });
    }
  }

  // This method is now deprecated - use FCM instead
  async showOrderUpdateNotification(orderData) {
    console.warn('showOrderUpdateNotification is deprecated. Use FCM push notifications instead.');
    
    if (!this.isFCMInitialized) {
      const { orderId, status } = orderData;
      
      const statusEmojis = {
        'accepted': '✅',
        'preparing': '👨‍🍳',
        'ready': '🔔',
        'completed': '🎉',
        'rejected': '❌'
      };

      const title = `${statusEmojis[status] || '📋'} Order #${orderId} ${status}`;
      const body = `Your order status has been updated to: ${status}`;

      return this.showNotification(title, {
        body,
        data: { orderId, type: 'order_update', status },
        tag: `order-${orderId}`,
        renotify: true
      });
    }
  }

  // Get FCM token for server-side usage
  getFCMToken() {
    return this.fcmToken;
  }

  // Check if FCM is properly initialized
  isFCMReady() {
    return this.isFCMInitialized;
  }

  // Handle notification clicks (now handled by service worker)
  handleNotificationClick(event) {
    console.log('Notification click handled by service worker');
    // This is now handled by the service worker
    // Keeping this method for backward compatibility
  }

  async handleOrderAction(orderId, action) {
    try {
      const response = await fetch(`/api/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        console.log(`Order ${orderId} ${action}ed successfully`);
        // Show confirmation notification
        this.showNotification(`Order ${action}ed`, {
          body: `Order #${orderId} has been ${action}ed`,
          tag: `order-${orderId}`
        });
      }
    } catch (error) {
      console.error(`Failed to ${action} order:`, error);
    }
  }
}

export default new NotificationManager();
