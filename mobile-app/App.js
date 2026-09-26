import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import apiClient from './src/api/client';

const isExpoGo = Boolean(
  Platform.OS === 'web' ||
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient ||
  Constants?.executionEnvironment === 'storeClient'
);

const getNotifications = () => {
  if (isExpoGo) return null;
  try {
    const { isRunningInExpoGo } = require('expo');
    if (isRunningInExpoGo && isRunningInExpoGo()) return null;
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

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
        const notif = getNotifications();
        if (notif?.dismissNotificationAsync) {
          await notif.dismissNotificationAsync(notification.request.identifier);
        }
      } catch (err) {
        if (err.response?.status === 409) {
           // Already processed - safe to dismiss
           const notif = getNotifications();
           if (notif?.dismissNotificationAsync) {
             await notif.dismissNotificationAsync(notification.request.identifier);
           }
        }
        console.error('Failed to handle background notification action:', err.response?.data || err.message);
      }
    }
  }
});

const notif = getNotifications();
if (notif?.registerTaskAsync) {
  try {
    notif.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch (err) {
    console.log('[App] Background notification task registration skipped:', err.message);
  }
}

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
