import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // In Expo Go or Web, completely bypass remote push notifications to allow fast live development
    const inExpoGo = Boolean(
      (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) ||
      Constants?.appOwnership === 'expo' ||
      Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient ||
      Constants?.executionEnvironment === 'storeClient'
    );
    if (Platform.OS === 'web' || inExpoGo) {
      console.log('[usePushNotifications] Running in Expo Go / Web — remote push bypassed.');
      return;
    }

    let Notifications;
    try {
      Notifications = require('expo-notifications');
    } catch (e) {
      return;
    }
    if (!Notifications) return;

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      registerForPushNotificationsAsync(Notifications).then(token => {
        if (token) setExpoPushToken(token);
      });

      // Listener fired when notification is received in foreground
      notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
        setNotification(notif);
      });

      // Listener fired when user taps on notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('User interacted with notification:', response);
      });
    } catch (err) {
      console.warn('[usePushNotifications] Push listener registration skipped:', err.message);
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync(Notifications) {
  if (!Notifications || Platform.OS === 'web') return null;

  try {
    // Define static notification categories right before we ask for permissions
    await Notifications.setNotificationCategoryAsync('order_pending', [
      {
        identifier: 'ACCEPT',
        buttonTitle: 'Accept Order',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'REJECT',
        buttonTitle: 'Reject Order',
        options: { isDestructive: true, opensAppToForeground: false },
      },
    ]);

    let token;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }
      
      const tokenResult = await Notifications.getExpoPushTokenAsync({});
      token = tokenResult?.data;
      console.log('Expo Push Token generated:', token);
    } else {
      console.warn('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      // Custom Alarm Channel for Orders (Max priority, alarm stream, bypass DND for high audibility)
      await Notifications.setNotificationChannelAsync('orders_alarm', {
        name: 'Order Alerts',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'order_received.mp3',
        bypassDnd: true,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
          },
        },
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#10B981',
        enableLights: true,
        enableVibrate: true,
      });
    }

    return token;
  } catch (error) {
    console.warn('[usePushNotifications] Push registration error:', error.message);
    return null;
  }
}
