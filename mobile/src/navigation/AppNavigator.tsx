import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import CameraScreen from "../screens/CameraScreen";
import CameraPreviewScreen from "../screens/CameraPreviewScreen";
import DiagnosisScreen from "../screens/DiagnosisScreen";
import DiagnosisDetailScreen from "../screens/DiagnosisDetailScreen";
import TreatmentScreen from "../screens/TreatmentScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CropListScreen from "../screens/CropListScreen";
import CropDetailScreen from "../screens/CropDetailScreen";
import CropFormScreen from "../screens/CropFormScreen";
import SensorNodeFormScreen from "../screens/SensorNodeFormScreen";
import OrdersScreen from "../screens/OrdersScreen";
import FinanceScreen from "../screens/FinanceScreen";

import MonitorScreen from "../screens/MonitorScreen";
import NotificationScreen from "../screens/NotificationScreen";
import Navbar2 from "../components/Navbar2";
import { useAuth } from "../services/AuthContext";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const DiagnosisStackNav = createStackNavigator();

function DiagnosisStack() {
  return (
    <DiagnosisStackNav.Navigator screenOptions={{ headerShown: false }}>
      <DiagnosisStackNav.Screen name="DiagnosisHistory" component={DiagnosisScreen} />
      <DiagnosisStackNav.Screen name="DiagnosisDetail" component={DiagnosisDetailScreen} />
      <DiagnosisStackNav.Screen name="Treatment" component={TreatmentScreen} />
    </DiagnosisStackNav.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <Navbar2 {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Notifications" component={NotificationScreen} />
      <Tab.Screen name="Diagnosis" component={DiagnosisStack} />
      <Tab.Screen name="Monitor" component={MonitorScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (__DEV__) console.log("🔧 [AppNavigator] isAuthenticated:", isAuthenticated, "isLoading:", isLoading);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fefbf2" }}>
        <ActivityIndicator size="large" color="#0e4719" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main">
              {() => <MainTabs />}
            </Stack.Screen>
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="CameraPreview" component={CameraPreviewScreen} />
            <Stack.Screen name="CropList" component={CropListScreen} />
            <Stack.Screen name="CropDetail" component={CropDetailScreen} />
            <Stack.Screen name="CropForm" component={CropFormScreen} />
            <Stack.Screen name="SensorNodeForm" component={SensorNodeFormScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="Finance" component={FinanceScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login">
              {() => <LoginScreen onLogin={login} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {() => <RegisterScreen onLogin={login} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
