import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Set up the base URL for the production backend
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.universeorder.co.in/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Add a request interceptor to attach the JWT token
apiClient.interceptors.request.use(
  async (config) => {
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
