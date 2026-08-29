import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const SocketContext = createContext();

if (!window.navigator) {
  window.navigator = {};
}
if (!window.navigator.userAgent) {
  window.navigator.userAgent = 'react-native';
}

const SOCKET_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://api.universeorder.co.in')
  .replace('/api', '')
  .replace('https://', 'wss://');

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
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

      newSocket = io(SOCKET_URL, {
        auth: { token }, // Pass JWT for server-side verification
        transports: ['websocket', 'polling'], 
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setSocketError(null);
        // The server validates this against the JWT, but we still send it
        const storeIdToJoin = user.storeId || user.id;
        newSocket.emit('join_store_room', storeIdToJoin);
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

  return (
    <SocketContext.Provider value={{ socket, isConnected, socketError }}>
      {children}
    </SocketContext.Provider>
  );
};
