import * as React from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import AppNavBar from "./AppNavBar";

const Navbar2 = ({ state, navigation }: BottomTabBarProps) => {
  const activeRoute = state.routes[state.index].name;
  return <AppNavBar activeRoute={activeRoute} navigation={navigation} />;
};

export default Navbar2;
