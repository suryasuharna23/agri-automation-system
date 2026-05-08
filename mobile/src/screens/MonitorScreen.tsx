import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Header from '../components/Header';
import { Theme } from '../theme';
import { sensorApi } from '../services/api';
import type { SensorNode, SensorReading } from '../types';

type MetricKey = 'temperature' | 'humidity' | 'soil_moisture' | 'ph';
const METRICS: { key: MetricKey; label: string; unit: string; icon: string; min: number; max: number }[] = [
  { key: 'temperature',  label: 'Suhu',           unit: '°C', icon: '🌡️', min: 15, max: 35 },
  { key: 'humidity',     label: 'Kelembapan Udara',unit: '%',  icon: '💨', min: 40, max: 90 },
  { key: 'soil_moisture',label: 'Kelembapan Tanah',unit: '%',  icon: '🌱', min: 20, max: 80 },
  { key: 'ph',           label: 'pH Air/Tanah',    unit: '',   icon: '⚗️', min: 5.5, max: 7.5 },
];

export default function MonitorScreen() {
  const insets = useSafeAreaInsets();
  const [nodes, setNodes]         = useState<SensorNode[]>([]);
  const [activeNode, setActiveNode] = useState<SensorNode | null>(null);
  const [readings, setReadings]   = useState<SensorReading[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const n = await sensorApi.listNodes();
      setNodes(n);
      const target = activeNode ?? n[0] ?? null;
      setActiveNode(target);
      if (target) {
        const r = await sensorApi.getReadings(target.id, 24);
        setReadings(r);
      }
    } catch {}
  }, [activeNode]);

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const selectNode = async (node: SensorNode) => {
    setActiveNode(node);
    const r = await sensorApi.getReadings(node.id, 24);
    setReadings(r);
  };

  const latest = readings[0];
  const anomalyCount = readings.filter((r) => r.is_anomaly).length;

  return (
    <View style={styles.flex}>
      <Header title="Monitor Lahan" subtitle={activeNode?.name ?? '—'} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.grass[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Node selector */}
        {nodes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nodeScroll} contentContainerStyle={styles.nodeList}>
            {nodes.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[styles.nodeChip, activeNode?.id === n.id && styles.nodeChipActive]}
                onPress={() => selectNode(n)}
              >
                <View style={[styles.nodeDot, { backgroundColor: n.is_active ? Theme.colors.success : Theme.colors.danger }]} />
                <Text style={[styles.nodeLabel, activeNode?.id === n.id && styles.nodeLabelActive]}>{n.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Status bar */}
        {anomalyCount > 0 && (
          <Card style={styles.anomalyBanner}>
            <Text style={styles.anomalyBannerText}>⚠️  {anomalyCount} anomali dalam 24 jam terakhir</Text>
          </Card>
        )}

        {/* Current metrics */}
        {latest && (
          <>
            <Text style={styles.sectionTitle}>Pembacaan Terkini</Text>
            <Text style={styles.readingTime}>
              {new Date(latest.recorded_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
            <View style={styles.metricGrid}>
              {METRICS.map((m) => {
                const val = latest[m.key];
                const isWarn = val !== null && (val < m.min || val > m.max);
                return (
                  <Card key={m.key} style={[styles.metricCard, isWarn && styles.metricCardWarn]}>
                    <Text style={styles.metricIcon}>{m.icon}</Text>
                    <Text style={[styles.metricVal, isWarn && styles.metricValWarn]}>
                      {val !== null ? `${val}${m.unit}` : '—'}
                    </Text>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    {isWarn && <Badge label="Anomali" variant="warning" style={styles.metricBadge} />}
                    <Text style={styles.metricRange}>{m.min}–{m.max}{m.unit}</Text>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* History list */}
        <Text style={styles.sectionTitle}>Riwayat 24 Jam</Text>
        {readings.length === 0 ? (
          <Card variant="muted" style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada data sensor. Pastikan perangkat IoT terhubung.</Text>
          </Card>
        ) : (
          readings.map((r) => (
            <Card key={r.id} style={[styles.histRow, r.is_anomaly && styles.histRowAnomaly]}>
              <View style={styles.histLeft}>
                <Text style={styles.histTime}>
                  {new Date(r.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {r.is_anomaly && <Badge label="Anomali" variant="warning" />}
              </View>
              <View style={styles.histMetrics}>
                <MiniMetric label="Suhu" value={r.temperature} unit="°C" />
                <MiniMetric label="Lembap" value={r.humidity} unit="%" />
                <MiniMetric label="Tanah" value={r.soil_moisture} unit="%" />
                <MiniMetric label="pH" value={r.ph} unit="" />
              </View>
              {r.is_anomaly && r.anomaly_description && (
                <Text style={styles.histAnomDesc} numberOfLines={2}>{r.anomaly_description}</Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function MiniMetric({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniVal}>{value !== null && value !== undefined ? `${value}${unit}` : '—'}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.bgBase },

  nodeScroll: { marginTop: Theme.spacing.sm },
  nodeList:   { paddingHorizontal: Theme.spacing.lg, gap: 8 },
  nodeChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Theme.radius.full, backgroundColor: Theme.colors.bgCard, borderWidth: 1, borderColor: Theme.colors.border },
  nodeChipActive: { backgroundColor: Theme.colors.grass[600], borderColor: Theme.colors.grass[600] },
  nodeDot:   { width: 8, height: 8, borderRadius: 4 },
  nodeLabel: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted },
  nodeLabelActive: { color: Theme.colors.white, fontWeight: Theme.font.weightMedium },

  anomalyBanner: { marginHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.md, backgroundColor: '#fef3c7', borderLeftWidth: 4, borderLeftColor: Theme.colors.warning },
  anomalyBannerText: { fontSize: Theme.font.sizeSm, color: '#92400e', fontWeight: Theme.font.weightMedium },

  sectionTitle: { fontSize: Theme.font.sizeLg, fontWeight: Theme.font.weightSemibold, color: Theme.colors.textPrimary, marginHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.lg, marginBottom: 4 },
  readingTime: { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted, marginHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.sm },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, paddingHorizontal: Theme.spacing.lg },
  metricCard: { width: '47%', alignItems: 'center', paddingVertical: Theme.spacing.md },
  metricCardWarn: { borderWidth: 1.5, borderColor: Theme.colors.warning },
  metricIcon: { fontSize: 24, marginBottom: 6 },
  metricVal:  { fontSize: Theme.font.size2xl, fontWeight: Theme.font.weightBold, color: Theme.colors.grass[700] },
  metricValWarn: { color: Theme.colors.warning },
  metricLabel: { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted, marginTop: 2 },
  metricBadge: { marginTop: 4 },
  metricRange: { fontSize: 10, color: Theme.colors.textMuted, marginTop: 3 },

  emptyCard: { marginHorizontal: Theme.spacing.lg },
  emptyText: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, textAlign: 'center' },

  histRow: { marginHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.sm, padding: Theme.spacing.sm },
  histRowAnomaly: { borderLeftWidth: 3, borderLeftColor: Theme.colors.warning },
  histLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  histTime: { fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightMedium, color: Theme.colors.textPrimary },
  histMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  histAnomDesc: { fontSize: Theme.font.sizeXs, color: '#a16207', marginTop: 6 },

  miniMetric: { alignItems: 'center' },
  miniVal:   { fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightSemibold, color: Theme.colors.grass[700] },
  miniLabel: { fontSize: 10, color: Theme.colors.textMuted },
});
