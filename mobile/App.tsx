import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { AuthProvider } from './src/context/AuthContext'
import { CartProvider } from './src/context/CartContext'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import AppNavigator from './src/navigation/AppNavigator'
import { processPendingUploads } from './src/utils/offlineUploads'
import { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    // Try processing any pending uploads on app start
    processPendingUploads().catch((err) => console.error('processPendingUploads failed', err))
  }, [])
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CartProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
            <StatusBar style="dark" />
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}