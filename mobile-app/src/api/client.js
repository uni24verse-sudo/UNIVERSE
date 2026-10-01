import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

import AsyncStorage from '@react-native-async-storage/async-storage';

let customBaseUrl = null;

// Initialize custom URL from storage with auto-migration from legacy domain
AsyncStorage.getItem('custom_api_url').then(val => {
  if (val) {
    if (val.includes('api.universeorder.co.in') || val.includes('uat.food.universeorder.co.in')) {
      val = val.replace(/(api|uat\.food)\.universeorder\.co\.in/, 'food.universeorder.co.in');
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

// Determine API URL: explicit env var (UAT in dev, Prod in EAS) > custom override > cloud server
export const getBaseUrl = () => {
  // 1. Explicit env variable (UAT during testing via .env, Production in EAS builds via eas.json)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (customBaseUrl) {
    if (customBaseUrl.includes('api.universeorder.co.in') || customBaseUrl.includes('uat.food.universeorder.co.in')) {
      return customBaseUrl.replace(/(api|uat\.food)\.universeorder\.co\.in/, 'food.universeorder.co.in');
    }
    return customBaseUrl;
  }

  // 2. Web Browser environment (localhost, 127.0.0.1)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:5000/api`;
    }
    return `${window.location.origin}/api`;
  }

  // 3. Active production cloud server
  return 'https://food.universeorder.co.in/api';
};

export const getSocketUrl = () => {
  return getBaseUrl().replace(/\/api\/?$/, '');
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
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

// Add a response interceptor to handle 401 Unauthorized and auto-fallback
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest && !originalRequest._retry) {
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error';
      const is404OnUat = error.response?.status === 404 && originalRequest.baseURL?.includes('uat.food.universeorder.co.in');

      if ((isNetworkError || is404OnUat) && originalRequest.baseURL?.includes('uat.food.universeorder.co.in')) {
        originalRequest._retry = true;
        originalRequest.baseURL = 'https://food.universeorder.co.in/api';
        console.log('[apiClient] Auto-fallback from uat to active cloud endpoint on network failure');
        return apiClient(originalRequest);
      }
    }

    if (__DEV__ && error) {
      console.warn(`[apiClient] Request failed: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.baseURL}${originalRequest?.url} - ${error.message}`);
    }

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
