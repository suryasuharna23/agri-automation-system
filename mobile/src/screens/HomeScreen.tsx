import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { sensorApi } from '../services/api';
import type { SensorNode, SensorReading } from '../types';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 28;

const METRICS = [
  { key: 'temperature'   as const, label: 'Suhu',   unit: '°C', r: 214, g: 85,  b: 40  },
  { key: 'humidity'      as const, label: 'Lembap', unit: '%',  r: 43,  g: 122, b: 226 },
  { key: 'soil_moisture' as const, label: 'Tanah',  unit: '%',  r: 100, g: 75,  b: 35  },
  { key: 'ph'            as const, label: 'pH',     unit: '',   r: 130, g: 43,  b: 210 },
];

const ACTIONS = [
  { label: 'Diagnosis\nPenyakit', icon: 'leaf'        as const, nav: 'Camera',  params: { mode: 'diagnosis' }, r: 14,  g: 71,  b: 25  },
  { label: 'Grading\nPanen',     icon: 'ribbon'       as const, nav: 'Camera',  params: { mode: 'grading'   }, r: 180, g: 90,  b: 20  },
  { label: 'Monitor\nLahan',     icon: 'stats-chart'  as const, nav: 'Monitor', params: undefined,              r: 43,  g: 100, b: 200 },
  { label: 'Riwayat\nDiagnosis', icon: 'time'         as const, nav: 'Diagnosis', params: undefined,            r: 120, g: 40,  b: 200 },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [node,          setNode]          = useState<SensorNode | null>(null);
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);

  const fetchData = async () => {
    try {
      const nodes = await sensorApi.listNodes();
      if (nodes.length > 0) {
        setNode(nodes[0]);
        const readings = await sensorApi.getReadings(nodes[0].id, 1);
        setLatestReading(readings[0] ?? null);
      }
    } catch (e) {
      if (__DEV__) console.error('[HomeScreen] fetchData:', e);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e4719" />}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Selamat Datang!</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="partly-sunny" size={20} color="#0e4719" />
          </View>
        </View>

        {/* ── Sensor overview card ── */}
        <View style={[styles.sensorCard, { width: CARD_W }]}>
          <LinearGradient
            style={StyleSheet.absoluteFillObject}
            colors={['#e7ede8', '#f5faf5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Card header */}
          <View style={styles.sensorCardHeader}>
            <View style={styles.sensorCardTitleRow}>
              <LinearGradient
                style={styles.sensorCardIcon}
                colors={['#ffd4a9', '#0e4719']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Ionicons name="leaf" size={14} color="#fff" />
              </LinearGradient>
              <Text style={styles.sensorCardTitle}>Kondisi Lahan Terkini</Text>
            </View>
            {node && (
              <View style={styles.nodePill}>
                <View style={[styles.nodeDot, { backgroundColor: node.is_active ? '#22c55e' : '#d94e4e' }]} />
                <Text style={styles.nodePillText}>{node.name.replace(/ \(.*\)$/, '')}</Text>
              </View>
            )}
          </View>

          {/* Anomaly banner */}
          {latestReading?.is_anomaly && (
            <View style={styles.anomalyBanner}>
              <Ionicons name="warning" size={14} color="#b91c1c" />
              <Text style={styles.anomalyText} numberOfLines={2}>
                {latestReading.anomaly_description}
              </Text>
            </View>
          )}

          {/* Metric pills */}
          {latestReading ? (
            <View style={styles.metricGrid}>
              {METRICS.map((m) => {
                const raw = latestReading[m.key];
                const val = raw != null ? Number(raw).toFixed(m.key === 'ph' ? 1 : 1) : '—';
                const color = `rgb(${m.r},${m.g},${m.b})`;
                return (
                  <View key={m.key} style={[styles.metricPill, { borderColor: `rgba(${m.r},${m.g},${m.b},0.3)` }]}>
                    <LinearGradient
                      style={StyleSheet.absoluteFillObject}
                      colors={[`rgba(${m.r},${m.g},${m.b},0.08)`, `rgba(${m.r},${m.g},${m.b},0.18)`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                    <Text style={[styles.metricVal, { color }]}>{val}{m.unit}</Text>
                    <Text style={[styles.metricLabel, { color }]}>{m.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>Belum ada data sensor</Text>
          )}

          {latestReading && (
            <Text style={styles.lastUpdated}>
              Diperbarui {new Date(latestReading.recorded_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
            </Text>
          )}
        </View>

        {/* ── Quick actions ── */}
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionGrid}>
          {ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => navigation.navigate(a.nav, a.params)}
              activeOpacity={0.8}
            >
              <LinearGradient
                style={StyleSheet.absoluteFillObject}
                colors={[`rgba(${a.r},${a.g},${a.b},0.10)`, `rgba(${a.r},${a.g},${a.b},0.22)`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <LinearGradient
                style={styles.actionIcon}
                colors={[`rgba(${a.r},${a.g},${a.b},0.6)`, `rgb(${a.r},${a.g},${a.b})`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={a.icon} size={22} color="#fff" />
              </LinearGradient>
              <Text style={[styles.actionLabel, { color: `rgb(${a.r},${a.g},${a.b})` }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffefb' },
  scroll: { paddingHorizontal: 14, gap: 14 },

  /* ── Header ── */
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  greeting: { fontSize: 26, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  date: { fontSize: 13, fontFamily: 'FacultyGlyphic_400Regular', color: '#55835e', marginTop: 2 },
  headerBadge: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#dbe3dd',
    borderWidth: 1, borderColor: '#0e4719', alignItems: 'center', justifyContent: 'center',
  },

  /* ── Sensor card ── */
  sensorCard: {
    borderRadius: 16, overflow: 'hidden', padding: 16, gap: 14,
    borderWidth: 1, borderColor: '#ccd9ce',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  sensorCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sensorCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sensorCardIcon: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sensorCardTitle: { fontSize: 15, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  nodePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dbe3dd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#0e4719',
  },
  nodeDot: { width: 7, height: 7, borderRadius: 4 },
  nodePillText: { fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },

  /* Anomaly banner */
  anomalyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
  },
  anomalyText: { flex: 1, fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#b91c1c', lineHeight: 17 },

  /* Metric pills 2x2 grid */
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricPill: {
    width: (CARD_W - 32 - 10) / 2,
    borderRadius: 12, overflow: 'hidden', borderWidth: 1,
    paddingVertical: 12, paddingHorizontal: 14, gap: 4,
  },
  metricVal: { fontSize: 22, fontFamily: 'FacultyGlyphic_400Regular', fontWeight: '700' },
  metricLabel: { fontSize: 11, fontFamily: 'FacultyGlyphic_400Regular' },

  lastUpdated: {
    fontSize: 11, fontFamily: 'FacultyGlyphic_400Regular',
    color: '#7a9a7e', fontStyle: 'italic', alignSelf: 'flex-end',
  },
  emptyText: {
    textAlign: 'center', fontSize: 13,
    fontFamily: 'FacultyGlyphic_400Regular', color: '#7a9a7e', paddingVertical: 16,
  },

  /* ── Section title ── */
  sectionTitle: { fontSize: 16, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },

  /* ── Action cards 2x2 ── */
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: (CARD_W - 12) / 2,
    borderRadius: 16, overflow: 'hidden',
    paddingVertical: 18, paddingHorizontal: 16, gap: 12,
    borderWidth: 1, borderColor: '#dde5de',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  actionIcon: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13, fontFamily: 'FacultyGlyphic_400Regular', lineHeight: 18,
  },
});
