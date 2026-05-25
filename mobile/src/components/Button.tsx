import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { Theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = false, style,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? Theme.colors.grass[600] : Theme.colors.white} size="small" />
      ) : (
        <Text style={[styles.label, styles[`labelVariant_${variant}`], styles[`labelSize_${size}`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },

  size_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  size_md: { paddingVertical: 14, paddingHorizontal: 24 },
  size_lg: { paddingVertical: 18, paddingHorizontal: 32 },

  variant_primary:   { backgroundColor: Theme.colors.grass[600] },
  variant_secondary: { backgroundColor: Theme.colors.grass[100] },
  variant_outline:   { backgroundColor: Theme.colors.transparent, borderWidth: 1.5, borderColor: Theme.colors.grass[600] },
  variant_ghost:     { backgroundColor: Theme.colors.transparent },
  variant_danger:    { backgroundColor: Theme.colors.danger },

  label: { fontFamily: 'Lato_400Regular', fontWeight: Theme.font.weightSemibold },
  labelVariant_primary:   { color: Theme.colors.white },
  labelVariant_secondary: { color: Theme.colors.grass[700] },
  labelVariant_outline:   { color: Theme.colors.grass[600] },
  labelVariant_ghost:     { color: Theme.colors.grass[600] },
  labelVariant_danger:    { color: Theme.colors.white },

  labelSize_sm: { fontSize: Theme.font.sizeSm },
  labelSize_md: { fontSize: Theme.font.sizeMd },
  labelSize_lg: { fontSize: Theme.font.sizeLg },
});
