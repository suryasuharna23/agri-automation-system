import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'muted' | 'grass';
}

export default function Card({ children, style, variant = 'default' }: Props) {
  return (
    <View style={[styles.card, styles[`variant_${variant}`], Theme.shadow.sm, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
  },
  variant_default: { backgroundColor: Theme.colors.bgCard },
  variant_muted:   { backgroundColor: Theme.colors.bgMuted },
  variant_grass:   { backgroundColor: Theme.colors.grass[50] },
});
