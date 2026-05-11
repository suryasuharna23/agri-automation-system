import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, View } from 'react-native';

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
import { Theme } from '../theme';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Theme.colors.bgCard,
          borderTopColor: Theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   Theme.colors.grass[700],
        tabBarInactiveTintColor: Theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: Theme.font.weightMedium },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Beranda', tabBarIcon: ({ focused }) => <TabIcon icon="🏡" focused={focused} /> }}
      />
      <Tab.Screen
        name="Monitor"
        component={MonitorScreen}
        options={{ title: 'Monitor', tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} /> }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: 'Kamera', tabBarIcon: ({ focused }) => <TabIcon icon="📷" focused={focused} /> }}
      />
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
      <Stack.Screen name="Main"           component={MainTabs} />
      <Stack.Screen name="CameraPreview"  component={CameraPreviewScreen} />
      <Stack.Screen name="Diagnosis"      component={DiagnosisScreen} />
      <Stack.Screen name="DiagnosisDetail"component={DiagnosisDetailScreen} />
      <Stack.Screen name="Treatment"      component={TreatmentScreen} />
      <Stack.Screen name="Notifications"  component={NotificationScreen} />
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
