import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../theme";

export default function StateView({
  title,
  message,
  loading,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator size="large" color={Theme.colors.grass[700]} />
        ) : (
          <View style={styles.iconWrap}>
            <Ionicons name="leaf-outline" size={28} color={Theme.colors.grass[700]} />
          </View>
        )}
        <Text style={styles.title} selectable>{title}</Text>
        {message ? <Text style={styles.message} selectable>{message}</Text> : null}
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.85}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: Theme.spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 10,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.bgCard,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadow.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.grass[100],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: Theme.font.sizeLg,
    fontFamily: "FacultyGlyphic_400Regular",
    color: Theme.colors.textPrimary,
    textAlign: "center",
  },
  message: {
    fontSize: Theme.font.sizeSm,
    fontFamily: "Lato_400Regular",
    color: Theme.colors.textMuted,
    textAlign: "justify",
    lineHeight: 19,
  },
  button: {
    marginTop: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.grass[700],
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 11,
    minWidth: 160,
    alignItems: "center",
  },
  buttonText: {
    fontSize: Theme.font.sizeSm,
    fontFamily: "Lato_400Regular",
    color: Theme.colors.white,
  },
});
