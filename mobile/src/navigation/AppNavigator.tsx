import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ActivationPendingScreen from '../screens/ActivationPendingScreen';
import ApplyForOwnerScreen from '../screens/ApplyForOwnerScreen';

// Role-based Navigators
import UserTabNavigator from './UserTabNavigator';
import OwnerTabNavigator from './OwnerTabNavigator';
import AdminTabNavigator from './AdminTabNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    // You can show a splash screen here
    return null;
  }

  const userRoleRaw = user?.role || (user as any)?.profile?.role || 'customer';
  const userRole = userRoleRaw === 'user' ? 'customer' : userRoleRaw;

  // Function to get the appropriate navigator based on role
  const getMainNavigator = () => {
    switch (userRole) {
      case 'admin':
        return AdminTabNavigator;
      case 'owner':
        return OwnerTabNavigator;
      default:
        return UserTabNavigator;
    }
  };

  const MainNavigator = getMainNavigator();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="ActivationPending" component={ActivationPendingScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          {userRole === 'customer' && (
            <Stack.Screen name="ApplyForOwner" component={ApplyForOwnerScreen} />
          )}
          <Stack.Screen name="OrderDetail" component={require('../screens/OrderDetailScreen').default} />
        </>
      )}
    </Stack.Navigator>
  );
}