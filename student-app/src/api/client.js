import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let customBaseUrl = null;

// Initialize custom URL from storage
AsyncStorage.getItem('universe_student_api_url').then(val => {
  if (val) customBaseUrl = val;
}).catch(() => {});

export const setCustomApiUrl = async (url) => {
  customBaseUrl = url;
  if (url) {
    await AsyncStorage.setItem('universe_student_api_url', url);
  } else {
    await AsyncStorage.removeItem('universe_student_api_url');
  }
};

export const getBaseUrl = () => {
  if (customBaseUrl) return customBaseUrl;

  // 1. Web Browser environment (localhost, 127.0.0.1, or local LAN IP e.g. 10.x.x.x, 192.168.x.x)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.endsWith('.local')
    ) {
      return `http://${hostname}:5000/api`;
    }
    return `${window.location.origin}/api`;
  }

  // 2. Development mode on phone (Expo Go)
  // Automatically extract the active Metro host IP the phone is connected to
  if (__DEV__) {
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || '';
    if (hostUri) {
      const devHost = hostUri.split(':')[0];
      if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
        return `http://${devHost}:5000/api`;
      }
    }

    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    return 'http://10.194.0.50:5000/api';
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Active production cloud server
  return 'https://food.universeorder.co.in/api';
};

export const getSocketUrl = () => {
  return getBaseUrl().replace(/\/api\/?$/, '');
};

export const getAssetUrl = (path, fallback = '') => {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const base = getBaseUrl().replace(/\/api\/?$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
apiClient.defaults.baseURL = getBaseUrl();

apiClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Automatic resilient fallback if network drops or domain is blocked on student cellular/Wi-Fi
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error';
    if (isNetworkError && originalRequest.baseURL?.includes('uat.food.universeorder.co.in')) {
      originalRequest._retry = true;
      originalRequest.baseURL = 'https://food.universeorder.co.in/api';
      console.log('[API] Auto-fallback to primary cloud endpoint on network failure');
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
