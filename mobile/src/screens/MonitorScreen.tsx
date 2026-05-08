import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { sensorApi } from "../services/api";
import type { SensorReading } from "../types";

export default function MonitorScreen() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const nodes = await sensorApi.listNodes();
      if (nodes.length > 0) {
        const data = await sensorApi.getReadings(nodes[0].id, 20);
        setReadings(data);
      }
    } catch (e) {
      console.error(e);
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
      <Text style={styles.title}>Monitor Lahan</Text>
      <Text style={styles.subtitle}>Riwayat 20 pembacaan terakhir</Text>

      {readings.map((r, idx) => (
        <View key={r.id} style={[styles.row, r.is_anomaly && styles.anomalyRow]}>
          <Text style={styles.rowTime}>{new Date(r.recorded_at).toLocaleString("id-ID")}</Text>
          <View style={styles.metrics}>
            <Metric label="Suhu" value={`${r.temperature ?? "-"}°C`} />
            <Metric label="Lembap" value={`${r.humidity ?? "-"}%`} />
            <Metric label="Tanah" value={`${r.soil_moisture ?? "-"}%`} />
            <Metric label="pH" value={`${r.ph ?? "-"}`} />
          </View>
          {r.is_anomaly && <Text style={styles.anomalyText}>{r.anomaly_description}</Text>}
        </View>
      ))}

      {readings.length === 0 && (
        <Text style={styles.empty}>Belum ada data pembacaan sensor.</Text>
      )}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8faf8", padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", color: "#2d6a4f", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  row: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 10, elevation: 1 },
  anomalyRow: { borderLeftWidth: 3, borderLeftColor: "#ef4444" },
  rowTime: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  metrics: { flexDirection: "row", justifyContent: "space-between" },
  metric: { alignItems: "center" },
  metricValue: { fontWeight: "bold", color: "#2d6a4f", fontSize: 15 },
  metricLabel: { fontSize: 10, color: "#9ca3af" },
  anomalyText: { fontSize: 12, color: "#ef4444", marginTop: 6 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
});
