import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Set up the base URL. Change this to your local IP for physical device testing.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.135.203.45:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
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
