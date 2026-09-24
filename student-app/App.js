import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { LocationProvider } from './src/context/LocationContext';
import { SocketProvider } from './src/context/SocketContext';
import { SoundProvider } from './src/context/SoundContext';
import { CartProvider } from './src/context/CartContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <LocationProvider>
        <SocketProvider>
          <SoundProvider>
            <CartProvider>
              <AppNavigator />
              <StatusBar style="dark" backgroundColor="transparent" translucent />
            </CartProvider>
          </SoundProvider>
        </SocketProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}
