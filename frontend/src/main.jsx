import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import NotificationManager from './utils/notifications.js'
import axios from 'axios'

// Universal API URL Resolver:
// Intercepts all requests that attempt to go to http://localhost:5000 when deployed on HTTPS/cloud
axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && window.location.hostname && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    if (config.url && config.url.startsWith('http://localhost:5000')) {
      config.url = config.url.replace('http://localhost:5000', window.location.origin);
    } else if (config.url && config.url.startsWith('http://')) {
      config.url = config.url.replace(/^http:\/\//, 'https://');
    }
  }
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
