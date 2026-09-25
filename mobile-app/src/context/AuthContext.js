import React, { createContext, useState, useEffect, useCallback } from 'react';
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
  const [stores, setStores] = useState([]);
  const [activeStore, setActiveStore] = useState(null);

  const logout = async () => {
    try {
      await deleteStorageItem('vendor_token');
      await deleteStorageItem('vendor_user');
      await deleteStorageItem('preferred_store_id');
      setUser(null);
      setStores([]);
      setActiveStore(null);
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  const switchActiveStore = async (storeOrId) => {
    // Employees are locked strictly to their assigned counter; only Owners can switch stalls
    if (user?.role === 'staff' || user?.role === 'employee') {
      return;
    }

    let targetStore = null;
    if (typeof storeOrId === 'object' && storeOrId !== null) {
      targetStore = storeOrId;
    } else if (typeof storeOrId === 'string') {
      targetStore = stores.find(s => (s.id || s._id) === storeOrId) || null;
    }
    if (targetStore) {
      setActiveStore(targetStore);
      const storeId = targetStore.id || targetStore._id;
      if (storeId) {
        await setStorageItem('preferred_store_id', storeId);
      }
    }
  };

  const refreshStores = useCallback(async () => {
    try {
      const res = await apiClient.get('/store/my-stores');
      const storeList = Array.isArray(res.data) ? res.data : [];
      setStores(storeList);

      if (storeList.length > 0) {
        const preferredId = await getStorageItem('preferred_store_id');
        let matched = null;
        if (preferredId) {
          matched = storeList.find(s => (s.id || s._id) === preferredId);
        }
        if (!matched && activeStore) {
          const currentId = activeStore.id || activeStore._id;
          matched = storeList.find(s => (s.id || s._id) === currentId);
        }
        const selected = matched || storeList[0];
        setActiveStore(selected);
      } else {
        setActiveStore(null);
      }
      return storeList;
    } catch (err) {
      console.error('[AuthContext] Failed to refresh stores:', err.message);
      return [];
    }
  }, [activeStore]);

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
        try {
          const res = await apiClient.get('/store/my-stores');
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          const storeList = Array.isArray(res.data) ? res.data : [];
          setStores(storeList);

          if (storeList.length > 0) {
            const preferredId = await getStorageItem('preferred_store_id');
            const matched = storeList.find(s => (s.id || s._id) === preferredId) || storeList[0];
            setActiveStore(matched);
          }
        } catch (err) {
          if (err.response?.status === 401) {
            console.log('[AuthContext] Token rejected by server (401). Clearing stale session.');
            await logout();
          } else {
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

      // Fetch stores immediately upon login
      try {
        const storeRes = await apiClient.get('/store/my-stores');
        const storeList = Array.isArray(storeRes.data) ? storeRes.data : [];
        setStores(storeList);
        if (storeList.length > 0) {
          const preferredId = await getStorageItem('preferred_store_id');
          const matched = storeList.find(s => (s.id || s._id) === preferredId) || storeList[0];
          setActiveStore(matched);
        }
      } catch (storeErr) {
        console.log('[AuthContext] Store fetch after login warning:', storeErr.message);
      }

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
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      updateUser,
      stores,
      activeStore,
      setActiveStore,
      switchActiveStore,
      refreshStores
    }}>
      {children}
    </AuthContext.Provider>
  );
};
