import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}

export default function Header({ title, subtitle, onBack, right, transparent }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }, transparent && styles.transparent]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        <View style={styles.rightWrap}>{right ?? <View style={styles.placeholder} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.bgBase,
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  transparent: {
    backgroundColor: Theme.colors.transparent,
    borderBottomWidth: 0,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  backBtn: {
    width: 36, height: 36,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.grass[100],
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: Theme.colors.grass[700], lineHeight: 22 },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  title:     { fontSize: Theme.font.sizeLg, fontWeight: Theme.font.weightSemibold, color: Theme.colors.textPrimary },
  subtitle:  { fontSize: Theme.font.sizeXs, fontFamily: 'Lato_400Regular', color: Theme.colors.textMuted, marginTop: 1 },
  rightWrap: { width: 36, alignItems: 'flex-end' },
  placeholder: { width: 36 },
});
