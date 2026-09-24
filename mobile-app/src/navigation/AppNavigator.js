import React, { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { usePushNotifications } from '../hooks/usePushNotifications';
import apiClient from '../api/client';
import * as SecureStore from 'expo-secure-store';

import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LiveOrdersScreen from '../screens/LiveOrdersScreen';
import ScannerScreen from '../screens/ScannerScreen';
import MenuScreen from '../screens/MenuScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#FFFFFF', 
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarActiveTintColor: '#EF4123',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Menu') {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size + 1} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Orders" 
        component={LiveOrdersScreen} 
        options={{ title: 'Live Orders' }} 
      />
      <Tab.Screen 
        name="Menu" 
        component={MenuScreen} 
        options={{ title: 'Menu' }} 
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ title: 'Analytics' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);
  const { expoPushToken } = usePushNotifications();

  React.useEffect(() => {
    if (user && expoPushToken) {
      const registerDevice = async () => {
        try {
          // Stable Device ID fallback
          let getStorage = Platform.OS === 'web' ? localStorage.getItem.bind(localStorage) : SecureStore.getItemAsync;
          let setStorage = Platform.OS === 'web' ? localStorage.setItem.bind(localStorage) : SecureStore.setItemAsync;
          
          let deviceId = await getStorage('local_device_id');
          if (!deviceId) {
            deviceId = `dev_${Math.random().toString(36).substr(2, 9)}`;
            await setStorage('local_device_id', deviceId);
          }

          await apiClient.post('/auth/register-device', {
            deviceId,
            pushToken: expoPushToken,
            platform: Platform.OS
          });
          console.log('Device successfully registered for Push Notifications');
        } catch (error) {
          console.error('Failed to register device:', error);
        }
      };
      registerDevice();
    }
  }, [user, expoPushToken]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4123" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="Scanner" component={ScannerScreen} options={{ presentation: 'fullScreenModal' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});
