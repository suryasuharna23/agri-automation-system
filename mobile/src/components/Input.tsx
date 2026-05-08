import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Theme } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export default function Input({ label, error, hint, rightIcon, onRightIconPress, style, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, focused && styles.inputFocused, !!error && styles.inputError]}>
        <TextInput
          {...props}
          style={[styles.input, style]}
          placeholderTextColor={Theme.colors.textMuted}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon} activeOpacity={0.7}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Theme.spacing.md },
  label: {
    fontSize: Theme.font.sizeSm,
    fontWeight: Theme.font.weightMedium,
    color: Theme.colors.textPrimary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
  },
  inputFocused: { borderColor: Theme.colors.borderFocus },
  inputError:   { borderColor: Theme.colors.danger },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: Theme.font.sizeMd,
    color: Theme.colors.textPrimary,
  },
  rightIcon: { padding: 4 },
  errorText: { fontSize: Theme.font.sizeXs, color: Theme.colors.danger, marginTop: 4 },
  hintText:  { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted, marginTop: 4 },
});
