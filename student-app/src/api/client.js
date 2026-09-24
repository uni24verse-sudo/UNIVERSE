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
  
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return `${window.location.origin}/api`;
  }

  // Mobile phones (Android/iOS): always connect to public UAT cloud endpoint
  return 'https://uat.food.universeorder.co.in/api';
};

export const getSocketUrl = () => {
  return getBaseUrl().replace(/\/api\/?$/, '');
};

const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

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
