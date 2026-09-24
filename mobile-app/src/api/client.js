import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform, NativeModules } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

let customBaseUrl = null;

// Initialize custom URL from storage with auto-migration from legacy domain
AsyncStorage.getItem('custom_api_url').then(val => {
  if (val) {
    if (val.includes('api.universeorder.co.in')) {
      val = val.replace('api.universeorder.co.in', 'food.universeorder.co.in');
      AsyncStorage.setItem('custom_api_url', val).catch(() => {});
    }
    customBaseUrl = val;
  }
}).catch(() => {});

export const setServerUrl = async (url) => {
  customBaseUrl = url;
  if (url) {
    await AsyncStorage.setItem('custom_api_url', url);
  } else {
    await AsyncStorage.removeItem('custom_api_url');
  }
};

// Determine API URL: custom override > explicit env var > local development on web > UAT cloud server
export const getBaseUrl = () => {
  if (customBaseUrl) {
    if (customBaseUrl.includes('api.universeorder.co.in')) {
      return customBaseUrl.replace('api.universeorder.co.in', 'uat.food.universeorder.co.in');
    }
    return customBaseUrl;
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }

  // Connect to UAT App Server (https://uat.food.universeorder.co.in)
  return 'https://uat.food.universeorder.co.in/api';
};

export const getSocketUrl = () => {
  return getBaseUrl().replace(/\/api\/?$/, '');
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Add a request interceptor to attach the JWT token
apiClient.interceptors.request.use(
  async (config) => {
    config.baseURL = getBaseUrl();
    try {
      let token;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('vendor_token');
      } else {
        token = await SecureStore.getItemAsync('vendor_token');
      }
      
      if (token) {
        config.headers.Authorization = token;
      }
    } catch (error) {
      console.error('Error fetching token from SecureStore', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

// Add a response interceptor to handle 401 Unauthorized (e.g. environment switch or expired token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('[apiClient] 401 Unauthorized received. Triggering session refresh/logout.');
      if (typeof onUnauthorizedCallback === 'function') {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
