import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import apiClient, { setOnUnauthorizedCallback } from '../api/client';

const getStorageItem = async (key) => {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return await SecureStore.getItemAsync(key);
};

const setStorageItem = async (key, value) => {
  if (Platform.OS === 'web') localStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
};

const deleteStorageItem = async (key) => {
  if (Platform.OS === 'web') localStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await deleteStorageItem('vendor_token');
      await deleteStorageItem('vendor_user');
      setUser(null);
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      console.log('[AuthContext] Logging out due to 401 Unauthorized');
      logout();
    });
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getStorageItem('vendor_token');
      const storedUser = await getStorageItem('vendor_user');
      if (token && storedUser) {
        // Validate token against active backend server
        try {
          await apiClient.get('/store/my-stores');
          setUser(JSON.parse(storedUser));
        } catch (err) {
          if (err.response?.status === 401) {
            console.log('[AuthContext] Token rejected by server (401). Clearing stale session.');
            await logout();
          } else {
            // Network glitch or offline, allow cached session
            setUser(JSON.parse(storedUser));
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore auth state', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/mobile-login', { email, password });
      const { token, admin } = response.data;

      await setStorageItem('vendor_token', token);
      await setStorageItem('vendor_user', JSON.stringify(admin));
      
      setUser(admin);
      return { success: true };
    } catch (error) {
      console.error('Login error details:', error);
      const serverMsg = error.response?.data?.message;
      const networkMsg = error.message;
      return { 
        success: false, 
        message: serverMsg || (networkMsg ? `${networkMsg}` : 'Login failed') 
      };
    }
  };

  const updateUser = async (updatedFields) => {
    try {
      const newUser = { ...user, ...updatedFields };
      setUser(newUser);
      await setStorageItem('vendor_user', JSON.stringify(newUser));
    } catch (e) {
      console.error('Failed to update local user state:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
