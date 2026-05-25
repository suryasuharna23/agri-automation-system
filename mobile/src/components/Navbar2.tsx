import * as React from "react";
import { View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import AppNavBar from "./AppNavBar";

const Navbar2 = ({ state, navigation }: BottomTabBarProps) => {
  const activeRoute = state.routes[state.index].name;
  return (
    <View style={{ width: "100%", height: 118 }}>
      <AppNavBar activeRoute={activeRoute} navigation={navigation} />
    </View>
  );
};

export default Navbar2;
