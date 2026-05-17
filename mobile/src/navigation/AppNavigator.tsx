import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CameraScreen from '../screens/CameraScreen';
import CameraPreviewScreen from '../screens/CameraPreviewScreen';
import DiagnosisScreen from '../screens/DiagnosisScreen';
import DiagnosisDetailScreen from '../screens/DiagnosisDetailScreen';
import TreatmentScreen from '../screens/TreatmentScreen';
import MonitorScreen from '../screens/MonitorScreen';
import NotificationScreen from '../screens/NotificationScreen';
import Navbar2 from '../components/Navbar2';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <Navbar2 {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard"     component={DashboardScreen} />
      <Tab.Screen name="Notifications" component={NotificationScreen} />
      <Tab.Screen name="Diagnosis"     component={DiagnosisScreen} />
      <Tab.Screen name="Monitor"       component={MonitorScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"            component={MainTabs} />
      <Stack.Screen name="Camera"          component={CameraScreen} />
      <Stack.Screen name="CameraPreview"   component={CameraPreviewScreen} />
      <Stack.Screen name="DiagnosisDetail" component={DiagnosisDetailScreen} />
      <Stack.Screen name="Treatment"       component={TreatmentScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = true;

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthStack} />
          <Stack.Screen name="Main" component={AppStack} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
