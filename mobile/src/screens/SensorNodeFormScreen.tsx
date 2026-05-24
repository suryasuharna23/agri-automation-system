import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { sensorApi } from "../services/api";

export default function SensorNodeFormScreen() {
  const navigation = useNavigation<any>();
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!deviceId.trim() || !name.trim()) {
      Alert.alert("Perhatian", "Device ID dan nama node wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await sensorApi.registerNode({
        device_id: deviceId.trim(),
        name: name.trim(),
        location: location.trim() || null,
      });
      Alert.alert("Berhasil", "Sensor node berhasil didaftarkan.");
      navigation.navigate("Monitor");
    } catch {
      Alert.alert("Gagal", "Sensor node belum bisa didaftarkan. Pastikan Device ID belum digunakan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0e4719" />
        </TouchableOpacity>
        <Text style={styles.title}>Tambah Sensor</Text>
        <View style={styles.iconSpace} />
      </View>
      <Field label="Device ID ESP32" value={deviceId} onChangeText={setDeviceId} placeholder="ESP32-001" />
      <Field label="Nama Node" value={name} onChangeText={setName} placeholder="Greenhouse A" />
      <Field label="Lokasi" value={location} onChangeText={setLocation} placeholder="Blok hidroponik 1" />
      <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} disabled={saving} onPress={save}>
        <Text style={styles.saveText}>{saving ? "Menyimpan..." : "Daftarkan Sensor"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#8aad8f"
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffefb" },
  content: { padding: 14, paddingTop: 48, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#dbe3dd", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0e4719" },
  iconSpace: { width: 40 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "FacultyGlyphic_400Regular", color: "#55835e" },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#ccd9ce", backgroundColor: "#f3f8f1", paddingHorizontal: 14, color: "#0e4719", fontFamily: "FacultyGlyphic_400Regular" },
  saveBtn: { height: 50, borderRadius: 14, backgroundColor: "#0e4719", alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 15, fontFamily: "FacultyGlyphic_400Regular", color: "#fbf2d4" },
  disabled: { opacity: 0.6 },
});
