import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

// Determine API URL: custom override > explicit env var > local development on web/LAN > production
export const getBaseUrl = () => {
  if (customBaseUrl) {
    if (customBaseUrl.includes('api.universeorder.co.in')) {
      return customBaseUrl.replace('api.universeorder.co.in', 'food.universeorder.co.in');
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
    // Local network IP (e.g. 192.168.x.x)
    if (/^192\.168\./.test(hostname) || /^10\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
      return `http://${hostname}:5000/api`;
    }
  }
  return 'https://food.universeorder.co.in/api';
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
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
