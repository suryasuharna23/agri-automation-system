import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

type ImageItem = { route: string; label: string; kind: 'image'; icon: any };
type IoniconsItem = { route: string; label: string; kind: 'ion'; ion: string };
type NavItem = ImageItem | IoniconsItem;

const LEFT_ITEMS: NavItem[] = [
  { route: 'Dashboard',     label: 'Dashboard',  kind: 'image', icon: require('../../assets/icons/icon-dashboard.png') },
  { route: 'Notifications', label: 'Notifikasi', kind: 'image', icon: require('../../assets/icons/icon-notification.png') },
];

const RIGHT_ITEMS: NavItem[] = [
  { route: 'Diagnosis', label: 'Diagnosis', kind: 'image', icon: require('../../assets/icons/icon-diagnosis.png') },
  { route: 'Monitor',   label: 'Monitor',   kind: 'image', icon: require('../../assets/icons/icon-monitor.png') },
];

interface Props {
  activeRoute?: string;
  navigation?: any;
}

export default function AppNavBar({ activeRoute, navigation: navProp }: Props) {
  const hookNav = useNavigation<any>();
  const navigation = navProp ?? hookNav;

  const go = (routeName: string) => navigation.navigate(routeName);

  const renderItem = (item: NavItem, width?: number) => {
    const active = activeRoute === item.route;
    return (
      <TouchableOpacity
        key={item.route}
        style={[styles.item, width ? { width } : null]}
        onPress={() => go(item.route)}
        activeOpacity={0.7}
      >
        {item.kind === 'image' ? (
          <Image style={[styles.icon, !active && styles.inactive]} resizeMode="cover" source={item.icon} />
        ) : (
          <Ionicons name={item.ion as any} size={24} color="#fbf2d4" style={!active && styles.inactive} />
        )}
        <Text style={[styles.label, !active && styles.inactiveText]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navbar}>
      <View style={styles.inner}>
        <View style={styles.sides}>
          <View style={styles.group}>
            {LEFT_ITEMS.map((item) => renderItem(item))}
          </View>
          <View style={styles.group}>
            {RIGHT_ITEMS.map((item) => renderItem(item))}
          </View>
        </View>
      </View>
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
});
