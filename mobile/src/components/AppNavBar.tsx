import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';
import IconDashboard from '../../assets/icons/icon-dashboard.svg';
import IconNotification from '../../assets/icons/icon-notification.svg';
import IconDiagnose from '../../assets/icons/icon-diagnose.svg';
import IconMonitor from '../../assets/icons/icon-monitor.svg';
import IconCamera from '../../assets/icons/icon-camera.svg';

type SvgItem = { route: string; label: string; kind: 'svg'; icon: React.FC<any> };
type IoniconsItem = { route: string; label: string; kind: 'ion'; ion: string };
type NavItem = SvgItem | IoniconsItem;

const LEFT_ITEMS: NavItem[] = [
  { route: 'Dashboard', label: 'Dashboard', kind: 'svg', icon: IconDashboard },
  { route: 'Monitor',   label: 'Monitor',   kind: 'svg', icon: IconMonitor },
];

const RIGHT_ITEMS: NavItem[] = [
  { route: 'Diagnosis', label: 'Diagnosis', kind: 'svg', icon: IconDiagnose },
  { route: 'Notifications', label: 'Notifikasi', kind: 'svg', icon: IconNotification },
];

interface Props {
  activeRoute?: string;
  navigation?: any;
}

export default function AppNavBar({ activeRoute, navigation: navProp }: Props) {
  const hookNav = useNavigation<any>();
  const navigation = navProp ?? hookNav;
  const insets = useSafeAreaInsets();

  const go = (routeName: string) => {
    if (routeName === 'Diagnosis') {
      navigation.navigate('Diagnosis', { screen: 'DiagnosisHistory' });
      return;
    }
    navigation.navigate(routeName);
  };

  const renderItem = (item: NavItem, width?: number) => {
    const active = activeRoute === item.route;
    return (
      <TouchableOpacity
        key={item.route}
        style={[styles.item, active && styles.itemActive, width ? { width } : null]}
        onPress={() => go(item.route)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
      >
        {item.kind === 'svg' ? (
          <View style={[styles.iconWrap, !active && styles.inactive]}>
            <item.icon width={24} height={24} />
          </View>
        ) : (
          <Ionicons name={item.ion as any} size={24} color={Theme.colors.cream[100]} style={!active && styles.inactive} />
        )}
        <Text style={[styles.label, active && styles.labelActive, !active && styles.inactiveText]}>{item.label}</Text>
        {active ? <View style={styles.activeDot} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.navbar, { height: styles.navbar.height + insets.bottom }]}>
      <View style={[styles.inner, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.sides}>
          <View style={styles.group}>
            {LEFT_ITEMS.map((item) => renderItem(item))}
          </View>
          <View style={styles.group}>
            {RIGHT_ITEMS.map((item) => renderItem(item))}
          </View>
        </View>
      </View>

      <LinearGradient
        style={styles.cameraWrap}
        locations={[0, 1]}
        colors={[Theme.colors.grass[800], Theme.colors.grass[900]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <TouchableOpacity onPress={() => go('Camera')} activeOpacity={0}>
          <LinearGradient
            style={styles.cameraBtn}
            locations={[0, 0.42]}
            colors={[Theme.colors.cream[600], Theme.colors.cream[100]]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <IconCamera width={40} height={40} />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 80,
    width: '100%',
    backgroundColor: Theme.colors.grass[800],
  },
  inner: {
    position: 'absolute',
    top: '22.2%',
    left: '0%',
    right: '0%',
    bottom: '0%',
    backgroundColor: Theme.colors.grass[800],
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
    gap: 4,
    minWidth: 64,
    paddingVertical: 6,
    borderRadius: Theme.radius.md,
  },
  itemActive: {
    backgroundColor: 'rgba(251,242,212,0.12)',
  },
  icon: {
    width: 24,
    height: 24,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: { opacity: 0.5 },
  label: {
    fontSize: 11,
    fontFamily: 'Lato_400Regular',
    color: Theme.colors.cream[100],
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '700',
  },
  inactiveText: { opacity: 0.5 },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.cream[100],
    marginTop: 2,
  },
  cameraWrap: {
    position: 'absolute',
    top: '-36%',
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
    ...Theme.shadow.sm,
  },
});
