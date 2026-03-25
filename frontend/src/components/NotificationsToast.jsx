import React, { useState, useEffect } from 'react';
import { X, Check, X as XIcon, Eye } from 'lucide-react';
import './NotificationsToast.css';

const NotificationsToast = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for new order events
    const handleNewOrder = (event) => {
      const orderData = event.detail;
      addNotification({
        id: `order-${orderData.orderId}`,
        type: 'new_order',
        title: '🍔 New Order Received!',
        message: `Order #${orderData.orderId} - ${orderData.customerName}`,
        data: orderData,
        actions: ['accept', 'reject', 'view']
      });
    };

    // Listen for order update events
    const handleOrderUpdate = (event) => {
      const orderData = event.detail;
      addNotification({
        id: `update-${orderData.orderId}`,
        type: 'order_update',
        title: `📋 Order #${orderData.orderId} ${orderData.status}`,
        message: `Order status updated to: ${orderData.status}`,
        data: orderData
      });
    };

    window.addEventListener('newOrder', handleNewOrder);
    window.addEventListener('orderUpdate', handleOrderUpdate);

    return () => {
      window.removeEventListener('newOrder', handleNewOrder);
      window.removeEventListener('orderUpdate', handleOrderUpdate);
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 5)); // Keep max 5 notifications
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAction = async (notification, action) => {
    const { data } = notification;
    
    try {
      if (action === 'accept' || action === 'reject') {
        const response = await fetch(`/api/orders/${data.orderId}/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          removeNotification(notification.id);
          // Show success feedback
          console.log(`Order ${action}ed successfully`);
        }
      } else if (action === 'view') {
        window.location.href = `/vendor/orders/${data.orderId}`;
      }
    } catch (error) {
      console.error(`Failed to ${action} order:`, error);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notifications-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification-toast ${notification.type}`}
        >
          <div className="notification-content">
            <div className="notification-header">
              <h4>{notification.title}</h4>
              <button
                onClick={() => removeNotification(notification.id)}
                className="notification-close"
              >
                <X size={16} />
              </button>
            </div>
            <p>{notification.message}</p>
            
            {notification.actions && (
              <div className="notification-actions">
                {notification.actions.includes('accept') && (
                  <button
                    onClick={() => handleAction(notification, 'accept')}
                    className="notification-btn accept-btn"
                  >
                    <Check size={14} />
                    Accept
                  </button>
                )}
                {notification.actions.includes('reject') && (
                  <button
                    onClick={() => handleAction(notification, 'reject')}
                    className="notification-btn reject-btn"
                  >
                    <XIcon size={14} />
                    Reject
                  </button>
                )}
                {notification.actions.includes('view') && (
                  <button
                    onClick={() => handleAction(notification, 'view')}
                    className="notification-btn view-btn"
                  >
                    <Eye size={14} />
                    View
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationsToast;
