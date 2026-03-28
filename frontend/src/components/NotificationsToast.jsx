import React, { useState, useEffect } from 'react';
import { X, Check, X as XIcon, Eye, ShoppingBag, Clock } from 'lucide-react';
import './NotificationsToast.css';

const ToastItem = ({ notification, onRemove, onAction }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onRemove(notification.id);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [notification.id, onRemove]);

  return (
    <div className={`notification-toast ${notification.type}`}>
      <div className="notification-content">
        <div className="notification-header">
          <div className="notification-title-area">
            {notification.type === 'new_order' ? <ShoppingBag size={18} className="title-icon" /> : <Clock size={18} className="title-icon" />}
            <h4>{notification.title}</h4>
          </div>
          <button
            onClick={() => onRemove(notification.id)}
            className="notification-close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="notification-body">
          <p className="notification-message">{notification.message}</p>
          {notification.type === 'new_order' && notification.data && (
            <div className="notification-meta">
              <span className="price-tag">₹{notification.data.totalAmount}</span>
              <span className="order-type">{notification.data.orderType}</span>
            </div>
          )}
        </div>
        
        {notification.actions && (
          <div className="notification-actions">
            {notification.actions.includes('accept') && (
              <button
                onClick={() => onAction(notification, 'accept')}
                className="notification-btn accept-btn"
              >
                <Check size={14} />
                Accept
              </button>
            )}
            {notification.actions.includes('reject') && (
              <button
                onClick={() => onAction(notification, 'reject')}
                className="notification-btn reject-btn"
              >
                <XIcon size={14} />
                Reject
              </button>
            )}
            {notification.actions.includes('view') && (
              <button
                onClick={() => onAction(notification, 'view')}
                className="notification-btn view-btn"
              >
                <Eye size={14} />
                View
              </button>
            )}
          </div>
        )}
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};

const NotificationsToast = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleNewOrder = (event) => {
      const orderData = event.detail;
      const id = orderData._id || orderData.id;
      
      // Avoid duplicates
      setNotifications(prev => {
        if (prev.find(n => n.id === `order-${id}`)) return prev;
        
        const newNotification = {
          id: `order-${id}`,
          type: 'new_order',
          title: 'New Order Received!',
          message: `Order #${orderData.orderNumber} from ${orderData.customerName || 'Customer'}`,
          data: orderData,
          actions: ['accept', 'reject', 'view']
        };
        return [newNotification, ...prev].slice(0, 5);
      });
    };

    const handleOrderUpdate = (event) => {
      const orderData = event.detail;
      const id = orderData._id || orderData.id;
      
      setNotifications(prev => {
        const newNotification = {
          id: `update-${id}-${Date.now()}`,
          type: 'order_update',
          title: `Order Update`,
          message: `Order #${orderData.orderNumber} is now ${orderData.status}`,
          data: orderData
        };
        return [newNotification, ...prev].slice(0, 5);
      });
    };

    window.addEventListener('newOrder', handleNewOrder);
    window.addEventListener('orderUpdate', handleOrderUpdate);

    return () => {
      window.removeEventListener('newOrder', handleNewOrder);
      window.removeEventListener('orderUpdate', handleOrderUpdate);
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAction = async (notification, action) => {
    const { data } = notification;
    const orderId = data._id || data.id;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    try {
      if (action === 'accept' || action === 'reject') {
        const newStatus = action === 'accept' ? 'Confirmed' : 'Cancelled';
        const response = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          removeNotification(notification.id);
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.message}`);
        }
      } else if (action === 'view') {
        window.location.href = `/vendor/dashboard`; // Redirect to dashboard since orders are there
        removeNotification(notification.id);
      }
    } catch (error) {
      console.error(`Failed to ${action} order:`, error);
      alert(`Network error: Could not ${action} order`);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notifications-container">
      {notifications.map(notification => (
        <ToastItem 
          key={notification.id} 
          notification={notification} 
          onRemove={removeNotification} 
          onAction={handleAction} 
        />
      ))}
    </div>
  );
};

export default NotificationsToast;
