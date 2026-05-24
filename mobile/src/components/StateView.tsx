import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
      {loading ? (
        <ActivityIndicator size="large" color="#0e4719" />
      ) : (
        <Ionicons name="leaf-outline" size={42} color="#8aad8f" />
      )}
      <Text style={styles.title} selectable>{title}</Text>
      {message ? <Text style={styles.message} selectable>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#0e4719",
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#55835e",
    textAlign: "center",
    lineHeight: 19,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#0e4719",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: "FacultyGlyphic_400Regular",
    color: "#fbf2d4",
  },
});
