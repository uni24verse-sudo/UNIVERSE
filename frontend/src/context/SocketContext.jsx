import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import NotificationManager from '../utils/notifications';
import axios from 'axios';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { vendor, token } = useContext(AuthContext);

  useEffect(() => {
    if (!vendor || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', async () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
      
      // Join vendor's store rooms for real-time order notifications globally
      try {
        const storesRes = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/store/my-stores', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        storesRes.data.forEach(store => {
          newSocket.emit('join_store_room', store._id);
          console.log('Joined store room:', store._id);
        });
      } catch (err) {
        console.error('Failed to fetch stores for socket context:', err);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    // Listen for new orders
    newSocket.on('new_order', async (orderData) => {
      console.log('New order received:', orderData);
      
      // Play notification sound if enabled, globally
      if (localStorage.getItem('orderSoundEnabled') !== 'false') {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio blocked:', e));
      }

      // Show browser notification
      await NotificationManager.showOrderNotification(orderData);
      
      // Also show in-app notification if page is visible
      if (document.visibilityState === 'visible') {
        // You can dispatch a custom event or use a state management solution
        window.dispatchEvent(new CustomEvent('newOrder', { detail: orderData }));
      }
    });

    // Listen for order updates
    newSocket.on('order_update', async (orderData) => {
      console.log('Order update received:', orderData);
      
      // Show browser notification for important updates
      if (['accepted', 'rejected', 'ready'].includes(orderData.status)) {
        await NotificationManager.showOrderUpdateNotification(orderData);
      }
      
      // Also show in-app notification if page is visible
      if (document.visibilityState === 'visible') {
        window.dispatchEvent(new CustomEvent('orderUpdate', { detail: orderData }));
      }
    });

    // Handle connection errors
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [vendor, token]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket && connected) {
        // Re-join store room when page becomes visible
        if (vendor?.storeId) {
          socket.emit('join_store_room', vendor.storeId);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, connected, vendor]);

  // Join store room when vendor changes
  useEffect(() => {
    if (socket && connected && vendor?.storeId) {
      socket.emit('join_store_room', vendor.storeId);
    }
  }, [vendor?.storeId, socket, connected]);

  const joinOrderRoom = (orderId) => {
    if (socket && connected) {
      socket.emit('join_order_room', orderId);
    }
  };

  const leaveOrderRoom = (orderId) => {
    if (socket && connected) {
      socket.emit('leave_order_room', orderId);
    }
  };

  const value = {
    socket,
    connected,
    joinOrderRoom,
    leaveOrderRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
