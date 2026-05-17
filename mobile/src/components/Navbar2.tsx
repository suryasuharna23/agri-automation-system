import * as React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const LEFT_ITEMS = [
  { route: "Dashboard",     label: "Dashboard",  icon: require("../../assets/icons/icon-dashboard.png") },
  { route: "Notifications", label: "Notifikasi", icon: require("../../assets/icons/icon-notification.png") },
] as const;

const RIGHT_ITEMS = [
  { route: "Diagnosis", label: "Diagnosis", icon: require("../../assets/icons/icon-diagnosis.png") },
  { route: "Monitor",   label: "Monitor",   icon: require("../../assets/icons/icon-monitor.png") },
] as const;

const Navbar2 = ({ state, navigation }: BottomTabBarProps) => {
  const activeRoute = state.routes[state.index].name;

  const go = (routeName: string) => navigation.navigate(routeName);

  const renderItem = (item: { route: string; label: string; icon: any }, width?: number) => {
    const active = activeRoute === item.route;
    return (
      <TouchableOpacity
        key={item.route}
        style={[styles.parentFlexBox, width ? { width } : null]}
        onPress={() => go(item.route)}
        activeOpacity={0.7}
      >
        <Image style={[styles.icondashboard, !active && styles.inactive]} resizeMode="cover" source={item.icon} />
        <Text style={[styles.dashboard, !active && styles.inactiveText]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navbar}>
      <View style={[styles.navbarInner, styles.navbarInnerFlexBox]}>
        <View style={[styles.frameParent, styles.frameFlexBox]}>
          <View style={[styles.frameFlexBox, styles.frameFlexBoxFlexBox]}>
            {LEFT_ITEMS.map((item) => renderItem(item, item.route === "Dashboard" ? 63 : undefined))}
          </View>
          <View style={[styles.frameFlexBox, styles.frameFlexBoxFlexBox]}>
            {RIGHT_ITEMS.map((item) => renderItem(item, item.route === "Diagnosis" ? 63 : undefined))}
          </View>
        </View>
      </View>

      <LinearGradient
        style={[styles.navbarChild, styles.navbarChildBg, styles.navbarChildLayout]}
        locations={[0, 1]}
        colors={["#0e4719", "#062f0e"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <TouchableOpacity onPress={() => go("Camera")} activeOpacity={0.8}>
          <LinearGradient
            style={[styles.iconcameraWrapper, styles.navbarChildBg, styles.navbarChildLayout]}
            locations={[0, 0.42]}
            colors={["#a69e84", "#fbf2d4"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Image
              style={styles.iconcamera}
              resizeMode="cover"
              source={require("../../assets/icons/icon-camera.png")}
            />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    height: 118,
    width: "100%",
  },
  navbarInner: {
    height: "67.8%",
    top: "32.2%",
    right: "0%",
    bottom: "0%",
    left: "0%",
    backgroundColor: "#0e4719",
    paddingHorizontal: 13,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: "center",
    justifyContent: "space-between",
    position: "absolute",
  },
  navbarInnerFlexBox: {
    flexDirection: "row",
  },
  frameParent: {
    maxWidth: "100%",
    justifyContent: "space-between",
    width: "100%",
    flexDirection: "row",
  },
  frameFlexBox: {
    gap: 20,
  },
  frameFlexBoxFlexBox: {
    flexDirection: "row",
  },
  icondashboard: {
    width: 24,
    height: 24,
  },
  inactive: {
    opacity: 0.5,
  },
  dashboard: {
    alignSelf: "center",
    fontSize: 10,
    fontFamily: "Lato-Regular",
    color: "#fbf2d4",
    textAlign: "center",
  },
  inactiveText: {
    opacity: 0.5,
  },
  parentFlexBox: {
    gap: 6,
    alignItems: "center",
  },
  navbarChild: {
    height: "55.51%",
    width: "21.5%",
    top: "0%",
    right: "40.33%",
    bottom: "44.49%",
    left: "38.17%",
    alignItems: "flex-start",
    paddingLeft: 9,
    paddingTop: 6,
    paddingRight: 10,
    paddingBottom: 7,
    position: "absolute",
  },
  navbarChildBg: {
    borderRadius: 12,
    overflow: "hidden",
  },
  navbarChildLayout: {
    borderRadius: 12,
  },
  iconcameraWrapper: {
    width: 66,
    height: 53,
    borderStyle: "solid",
    borderColor: "transparent",
    borderWidth: 3,
    justifyContent: "center",
    paddingHorizontal: 9,
    paddingBottom: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  iconcamera: {
    height: 40,
    width: 40,
  },
});

export default Navbar2;
