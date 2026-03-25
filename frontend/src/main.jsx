import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import NotificationManager from './utils/notifications.js'

// Initialize notifications
NotificationManager.initialize().then(success => {
  if (success) {
    console.log('Notifications initialized successfully');
  } else {
    console.warn('Failed to initialize notifications');
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
