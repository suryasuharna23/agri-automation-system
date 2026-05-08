import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { Theme } from '../theme';
import { sensorApi, marketplaceApi } from '../services/api';
import type { SensorReading, User } from '../types';

interface QuickAction { icon: string; label: string; onPress: () => void; color: string }

export default function DashboardScreen() {
  const navigation  = useNavigation<any>();
  const insets      = useSafeAreaInsets();

  const [user, setUser]               = useState<User | null>(null);
  const [latest, setLatest]           = useState<SensorReading | null>(null);
  const [anomalies, setAnomalies]     = useState<SensorReading[]>([]);
  const [prices, setPrices]           = useState<Record<string, number>>({});
  const [refreshing, setRefreshing]   = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await SecureStore.getItemAsync('user');
      if (raw) setUser(JSON.parse(raw));

      const nodes = await sensorApi.listNodes();
      if (nodes.length > 0) {
        const readings = await sensorApi.getReadings(nodes[0].id, 10);
        setLatest(readings[0] ?? null);
        setAnomalies(readings.filter((r: SensorReading) => r.is_anomaly));
      }
      const p = await marketplaceApi.getPrices();
      setPrices(p ?? {});
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const quickActions: QuickAction[] = [
    { icon: '📷', label: 'Grading Panen', onPress: () => navigation.navigate('Camera', { mode: 'grading' }), color: Theme.colors.grass[600] },
    { icon: '🔬', label: 'Diagnosis', onPress: () => navigation.navigate('Camera', { mode: 'diagnosis' }), color: Theme.colors.green[500] },
    { icon: '📊', label: 'Monitor Lahan', onPress: () => navigation.navigate('Monitor'), color: Theme.colors.grass[700] },
    { icon: '🛒', label: 'Marketplace', onPress: () => navigation.navigate('Market'), color: Theme.colors.cream[600] },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.grass[600]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.greeting}>Selamat datang,</Text>
          <Text style={styles.userName}>{user?.full_name ?? 'Petani'} 👋</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.notifIcon}>🔔</Text>
          {anomalies.length > 0 && <View style={styles.notifDot} />}
        </TouchableOpacity>
      </View>

      {/* Anomaly alert banner */}
      {anomalies.length > 0 && (
        <Card style={styles.alertCard}>
          <View style={styles.alertRow}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>Ada {anomalies.length} anomali terdeteksi</Text>
              <Text style={styles.alertBody} numberOfLines={2}>
                {anomalies[0].anomaly_description}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Sensor overview */}
      <Text style={styles.sectionTitle}>Kondisi Lahan Terkini</Text>
      {latest ? (
        <View style={styles.sensorGrid}>
          <SensorTile label="Suhu" value={`${latest.temperature ?? '—'}°C`} icon="🌡️" warn={false} />
          <SensorTile label="Kelembapan" value={`${latest.humidity ?? '—'}%`} icon="💧" warn={false} />
          <SensorTile label="Tanah" value={`${latest.soil_moisture ?? '—'}%`} icon="🌱" warn={false} />
          <SensorTile label="pH" value={`${latest.ph ?? '—'}`} icon="⚗️" warn={latest.is_anomaly} />
        </View>
      ) : (
        <Card variant="muted" style={styles.emptyCard}>
          <Text style={styles.emptyText}>Belum ada data sensor. Tambahkan node IoT terlebih dahulu.</Text>
        </Card>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Aksi Cepat</Text>
      <View style={styles.actionGrid}>
        {quickActions.map((a) => (
          <TouchableOpacity key={a.label} style={[styles.actionBtn, { backgroundColor: a.color }]} onPress={a.onPress} activeOpacity={0.85}>
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Commodity prices */}
      {Object.keys(prices).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Harga Komoditas Hari Ini</Text>
          <Card>
            {Object.entries(prices).slice(0, 4).map(([name, price], i) => (
              <View key={name} style={[styles.priceRow, i > 0 && styles.priceBorder]}>
                <Text style={styles.priceName}>{name}</Text>
                <Text style={styles.priceValue}>Rp {Number(price).toLocaleString('id-ID')}/kg</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function SensorTile({ label, value, icon, warn }: { label: string; value: string; icon: string; warn: boolean }) {
  return (
    <Card style={[styles.sensorTile, warn && styles.sensorTileWarn]}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <Text style={[styles.tileValue, warn && styles.tileValueWarn]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.bgBase },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.lg,
  },
  greeting:  { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted },
  userName:  { fontSize: Theme.font.size2xl, fontWeight: Theme.font.weightBold, color: Theme.colors.textPrimary },
  notifBtn: {
    width: 44, height: 44, borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.bgCard, alignItems: 'center', justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  notifIcon: { fontSize: 22 },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Theme.colors.danger,
  },

  alertCard: {
    marginHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.md,
    backgroundColor: '#fef3c7', borderLeftWidth: 4, borderLeftColor: Theme.colors.warning,
    borderRadius: Theme.radius.lg, padding: Theme.spacing.md,
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  alertIcon: { fontSize: 22, marginTop: 2 },
  alertText: { flex: 1 },
  alertTitle: { fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightSemibold, color: '#92400e' },
  alertBody:  { fontSize: Theme.font.sizeXs, color: '#a16207', marginTop: 2 },

  sectionTitle: {
    fontSize: Theme.font.sizeLg, fontWeight: Theme.font.weightSemibold,
    color: Theme.colors.textPrimary,
    marginHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.sm, marginTop: Theme.spacing.md,
  },

  sensorGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.sm,
  },
  sensorTile:     { width: '47%', alignItems: 'center', paddingVertical: Theme.spacing.md },
  sensorTileWarn: { borderWidth: 1.5, borderColor: Theme.colors.warning },
  tileIcon:      { fontSize: 26, marginBottom: 6 },
  tileValue:     { fontSize: Theme.font.size2xl, fontWeight: Theme.font.weightBold, color: Theme.colors.grass[700] },
  tileValueWarn: { color: Theme.colors.warning },
  tileLabel:     { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted, marginTop: 2 },

  emptyCard: { marginHorizontal: Theme.spacing.lg },
  emptyText: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, textAlign: 'center' },

  actionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
  },
  actionBtn: {
    width: '47%', borderRadius: Theme.radius.lg, padding: Theme.spacing.md,
    alignItems: 'center', gap: 8,
    ...Theme.shadow.sm,
  },
  actionIcon:  { fontSize: 32 },
  actionLabel: { fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightSemibold, color: Theme.colors.white },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  priceBorder: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  priceName:  { fontSize: Theme.font.sizeSm, color: Theme.colors.textPrimary, fontWeight: Theme.font.weightMedium },
  priceValue: { fontSize: Theme.font.sizeSm, color: Theme.colors.grass[600], fontWeight: Theme.font.weightSemibold },
});
