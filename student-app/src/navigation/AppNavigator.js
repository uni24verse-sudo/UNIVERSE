import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LocationPortalScreen from '../screens/LocationPortalScreen';
import HomeScreen from '../screens/HomeScreen';
import StoreMenuScreen from '../screens/StoreMenuScreen';
import CartScreen from '../screens/CartScreen';
import OrderTrackerScreen from '../screens/OrderTrackerScreen';
import SearchScreen from '../screens/SearchScreen';
import RecentOrdersScreen from '../screens/RecentOrdersScreen';
import TermsAndPrivacyScreen from '../screens/TermsAndPrivacyScreen';
import UnifiedStudentDock from '../components/UnifiedStudentDock';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const navigationRef = useRef(null);
  const [currentRoute, setCurrentRoute] = useState('Splash');

  const onNavigationStateChange = () => {
    const route = navigationRef.current?.getCurrentRoute();
    if (route?.name) {
      setCurrentRoute(route.name);
    }
  };

  return (
    <View style={styles.container}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={onNavigationStateChange}
      >
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="LocationPortal" component={LocationPortalScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="StoreMenu" component={StoreMenuScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="OrderTracker" component={OrderTrackerScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="RecentOrders" component={RecentOrdersScreen} />
          <Stack.Screen name="TermsAndPrivacy" component={TermsAndPrivacyScreen} />
        </Stack.Navigator>

        {/* Global Floating Unified Student Dock */}
        <UnifiedStudentDock
          navigation={{
            navigate: (name, params) => navigationRef.current?.navigate(name, params),
            goBack: () => navigationRef.current?.goBack(),
          }}
          currentRouteName={currentRoute}
        />
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default AppNavigator;
