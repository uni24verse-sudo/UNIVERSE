class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.audio = null;
  }

  async initialize() {
    try {
      this.permission = Notification.permission;
      this.createNotificationSound();
      return true;
    } catch (error) {
      console.error('Failed to initialize notification manager:', error);
      return false;
    }
  }

  createNotificationSound() {
    // Create a simple notification sound (UniVerse official alert)
    this.audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }

  async showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      return false;
    }

    try {
      this.playNotificationSound();

      // Show browser notification
      new Notification(title, {
        icon: '/icons.svg',
        badge: '/favicon.svg',
        requireInteraction: true,
        ...options
      });

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  playNotificationSound() {
    if (this.audio) {
      this.audio.play().catch(() => {});
    }
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
      tag: `order-${orderId}`,
      renotify: true
    });
  }

  // Compatibility stubs for any legacy calls
  getFCMToken() { return null; }
  isFCMReady() { return false; }
}

export default new NotificationManager();
