import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import apiClient from './src/api/client';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }
  if (data) {
    const { actionIdentifier, notification } = data;
    const orderId = notification?.request?.content?.data?.orderId;
    
    if (orderId && (actionIdentifier === 'ACCEPT' || actionIdentifier === 'REJECT')) {
      try {
        let newStatus = actionIdentifier === 'ACCEPT' ? 'Confirmed' : 'Cancelled';
        
        await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
        
        // If successful, dismiss the notification
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      } catch (err) {
        if (err.response?.status === 409) {
           // Already processed - safe to dismiss
           await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
        console.error('Failed to handle background notification action:', err.response?.data || err.message);
      }
    }
  }
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
