import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { getSocketUrl } from '../api/client';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, stores } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);

  useEffect(() => {
    let newSocket;

    const initSocket = async () => {
      if (!user) return;

      let token;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('vendor_token');
      } else {
        token = await SecureStore.getItemAsync('vendor_token');
      }

      if (!token) return;

      const socketUrl = getSocketUrl();
      const isSecure = socketUrl.startsWith('https://');

      newSocket = io(socketUrl, {
        auth: { token }, // Pass JWT for server-side verification
        secure: isSecure,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setSocketError(null);

        // Join rooms for all vendor owned stores
        if (stores && stores.length > 0) {
          stores.forEach(s => {
            const sid = s.id || s._id;
            if (sid) newSocket.emit('join_store_room', sid);
          });
        }
        const defaultStoreId = user.storeId || user.id;
        if (defaultStoreId) {
          newSocket.emit('join_store_room', defaultStoreId);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connect error:', err.message);
        setSocketError(err.message);
      });

      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  // Keep all store rooms joined whenever stores list refreshes or changes
  useEffect(() => {
    if (socket && isConnected && stores && stores.length > 0) {
      stores.forEach(s => {
        const sid = s.id || s._id;
        if (sid) {
          socket.emit('join_store_room', sid);
        }
      });
    }
  }, [socket, isConnected, stores]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, socketError }}>
      {children}
    </SocketContext.Provider>
  );
};
