import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "../screens/HomeScreen";
import CameraScreen from "../screens/CameraScreen";
import MonitorScreen from "../screens/MonitorScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#2d6a4f",
        tabBarInactiveTintColor: "#9ca3af",
        headerStyle: { backgroundColor: "#2d6a4f" },
        headerTintColor: "#fff",
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Beranda" }} />
      <Tab.Screen name="Monitor" component={MonitorScreen} options={{ title: "Monitor" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Camera"
          component={CameraScreen}
          options={{ headerShown: true, title: "Kamera AI", headerStyle: { backgroundColor: "#2d6a4f" }, headerTintColor: "#fff" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
