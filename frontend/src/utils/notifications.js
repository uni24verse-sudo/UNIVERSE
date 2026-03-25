class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.swRegistration = null;
    this.audio = null;
  }

  async initialize() {
    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      }

      // Request notification permission
      if ('Notification' in window) {
        this.permission = await Notification.requestPermission();
        console.log('Notification permission:', this.permission);
      }

      // Create notification sound
      this.createNotificationSound();

      return this.permission === 'granted';
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  createNotificationSound() {
    // Create a simple notification sound using Web Audio API
    this.audio = new Audio();
    this.audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
  }

  async showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      // Play notification sound
      this.playNotificationSound();

      // Show browser notification
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

  async showOrderNotification(orderData) {
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

  async showOrderUpdateNotification(orderData) {
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

  // Handle notification clicks
  handleNotificationClick(event) {
    const { action, data } = event.notification;
    
    if (data?.type === 'new_order') {
      const orderId = data.orderId;
      
      switch (action) {
        case 'accept':
          this.handleOrderAction(orderId, 'accept');
          break;
        case 'reject':
          this.handleOrderAction(orderId, 'reject');
          break;
        case 'view':
          window.location.href = `/vendor/orders/${orderId}`;
          break;
        default:
          window.location.href = '/vendor/orders';
      }
    }
    
    event.notification.close();
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
