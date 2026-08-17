import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Set how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification 
    // (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User interacted with notification:', response);
      // In Phase 2C-2, we will intercept ACCEPT/REJECT actions here
    });

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

async function registerForPushNotificationsAsync() {
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
  if (Platform.OS === 'web') return null; // Push not supported on web in this setup

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
    
    token = (await Notifications.getExpoPushTokenAsync({
      // We rely on Expo's default projectId from app.json
    })).data;
    console.log('Expo Push Token generated:', token);
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    // Custom Alarm Channel for Orders (New ID to force Android to recreate it)
    Notifications.setNotificationChannelAsync('orders_alarm', {
      name: 'Order Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'order_received.mp3', // Needs to exactly match the file in assets without the path
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#10B981',
    });
  }

  return token;
}
