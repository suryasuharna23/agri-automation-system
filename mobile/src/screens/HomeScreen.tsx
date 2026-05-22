import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { sensorApi } from "../services/api";
import type { SensorReading } from "../types";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const nodes = await sensorApi.listNodes();
      if (nodes.length > 0) {
        const readings = await sensorApi.getReadings(nodes[0].id, 1);
        setLatestReading(readings[0] ?? null);
      }
    } catch (e) {
      if (__DEV__) console.error(e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Selamat Datang, Petani!</Text>

      {/* Sensor Summary */}
      <Text style={styles.sectionTitle}>Kondisi Lahan Terkini</Text>
      {latestReading ? (
        <View style={[styles.card, latestReading.is_anomaly && styles.anomalyCard]}>
          {latestReading.is_anomaly && (
            <Text style={styles.anomalyText}>Peringatan: {latestReading.anomaly_description}</Text>
          )}
          <View style={styles.sensorGrid}>
            <SensorItem label="Suhu" value={`${latestReading.temperature ?? "-"}Â°C`} />
            <SensorItem label="Kelembapan" value={`${latestReading.humidity ?? "-"}%`} />
            <SensorItem label="Kelembapan Tanah" value={`${latestReading.soil_moisture ?? "-"}%`} />
            <SensorItem label="pH" value={`${latestReading.ph ?? "-"}`} />
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>Belum ada data sensor</Text>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Aksi Cepat</Text>
      <View style={styles.actionGrid}>
        <ActionButton label="Grading Panen" onPress={() => navigation.navigate("Camera", { mode: "grading" })} />
        <ActionButton label="Diagnosis Penyakit" onPress={() => navigation.navigate("Camera", { mode: "diagnosis" })} />
        <ActionButton label="Monitor Lahan" onPress={() => navigation.navigate("Monitor")} />
        <ActionButton label="Marketplace" onPress={() => navigation.navigate("Market")} />
      </View>
    </ScrollView>
  );
}

function SensorItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sensorItem}>
      <Text style={styles.sensorValue}>{value}</Text>
      <Text style={styles.sensorLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8faf8", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#2d6a4f", marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginVertical: 12 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  anomalyCard: { borderLeftWidth: 4, borderLeftColor: "#ef4444" },
  anomalyText: { color: "#ef4444", fontSize: 13, marginBottom: 8 },
  sensorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sensorItem: { width: "45%", alignItems: "center", padding: 8 },
  sensorValue: { fontSize: 24, fontWeight: "bold", color: "#2d6a4f" },
  sensorLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionButton: { width: "47%", backgroundColor: "#2d6a4f", borderRadius: 12, padding: 16, alignItems: "center" },
  actionLabel: { color: "#fff", fontWeight: "600", fontSize: 14 },
  emptyText: { textAlign: "center", color: "#9ca3af" },
});
