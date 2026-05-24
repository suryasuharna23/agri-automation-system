import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const LEFT_ITEMS = [
  { route: 'Dashboard',     label: 'Dashboard',  icon: require('../../assets/icons/icon-dashboard.png') },
  { route: 'Notifications', label: 'Notifikasi', icon: require('../../assets/icons/icon-notification.png') },
] as const;

const RIGHT_ITEMS = [
  { route: 'Diagnosis', label: 'Diagnosis', icon: require('../../assets/icons/icon-diagnosis.png') },
  { route: 'Monitor',   label: 'Monitor',   icon: require('../../assets/icons/icon-monitor.png') },
] as const;

interface Props {
  activeRoute?: string;
  navigation?: any;
}

export default function AppNavBar({ activeRoute, navigation: navProp }: Props) {
  const hookNav = useNavigation<any>();
  const navigation = navProp ?? hookNav;

  const go = (routeName: string) => navigation.navigate(routeName);

  const renderItem = (item: { route: string; label: string; icon: any }, width?: number) => {
    const active = activeRoute === item.route;
    return (
      <TouchableOpacity
        key={item.route}
        style={[styles.item, width ? { width } : null]}
        onPress={() => go(item.route)}
        activeOpacity={0.7}
      >
        <Image style={[styles.icon, !active && styles.inactive]} resizeMode="cover" source={item.icon} />
        <Text style={[styles.label, !active && styles.inactiveText]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navbar}>
      <View style={styles.inner}>
        <View style={styles.sides}>
          <View style={styles.group}>
            {LEFT_ITEMS.map((item) => renderItem(item, item.route === 'Dashboard' ? 63 : undefined))}
          </View>
          <View style={styles.group}>
            {RIGHT_ITEMS.map((item) => renderItem(item, item.route === 'Diagnosis' ? 63 : undefined))}
          </View>
        </View>
      </View>

      <LinearGradient
        style={styles.cameraWrap}
        locations={[0, 1]}
        colors={['#0e4719', '#062f0e']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <TouchableOpacity onPress={() => go('Camera')} activeOpacity={0.8}>
          <LinearGradient
            style={styles.cameraBtn}
            locations={[0, 0.42]}
            colors={['#a69e84', '#fbf2d4']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Image style={styles.cameraIcon} resizeMode="cover" source={require('../../assets/icons/icon-camera.png')} />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 118,
    width: '100%',
  },
  inner: {
    position: 'absolute',
    top: '32.2%',
    left: '0%',
    right: '0%',
    bottom: '0%',
    backgroundColor: '#0e4719',
    paddingHorizontal: 13,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sides: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  group: {
    flexDirection: 'row',
    gap: 20,
  },
  item: {
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    width: 24,
    height: 24,
  },
  inactive: { opacity: 0.5 },
  label: {
    fontSize: 10,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#fbf2d4',
    textAlign: 'center',
  },
  inactiveText: { opacity: 0.5 },
  cameraWrap: {
    position: 'absolute',
    top: '0%',
    left: '38.17%',
    right: '40.33%',
    height: '55.51%',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'flex-start',
    paddingLeft: 9,
    paddingTop: 6,
    paddingRight: 10,
    paddingBottom: 7,
  },
  cameraBtn: {
    width: 66,
    height: 53,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 40,
    height: 40,
  },
});
