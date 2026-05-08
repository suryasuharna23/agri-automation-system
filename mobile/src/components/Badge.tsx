import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'grass' | 'neutral';

interface Props {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: Theme.colors.grass[100],  text: Theme.colors.grass[700] },
  warning: { bg: '#fef3c7',                text: '#92400e' },
  danger:  { bg: '#fee2e2',                text: '#991b1b' },
  info:    { bg: '#dbeafe',                text: '#1e40af' },
  grass:   { bg: Theme.colors.grass[600],  text: Theme.colors.white },
  neutral: { bg: Theme.colors.bgMuted,     text: Theme.colors.textMuted },
};

export default function Badge({ label, variant = 'neutral', style }: Props) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: Theme.font.sizeXs, fontWeight: Theme.font.weightSemibold },
});
