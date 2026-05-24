import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, FlatList, Pressable, RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sensorApi, aiApi } from '../services/api';
import type { SensorNode, SensorReading } from '../types';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W   = SCREEN_W - 28;

type Period = '1h' | '5h' | '1d';
type Metric = 'temperature' | 'humidity' | 'soil_moisture' | 'ph';

const PERIODS: Period[] = ['1h', '5h', '1d'];
const PERIOD_HOURS: Record<Period, number> = { '1h': 1, '5h': 5, '1d': 24 };

const METRIC_CFG = [
  { key: 'temperature'   as Metric, label: 'Suhu',   unit: '°C', r: 214, g: 85,  b: 40  },
  { key: 'humidity'      as Metric, label: 'Lembap', unit: '%',  r: 43,  g: 122, b: 226 },
  { key: 'soil_moisture' as Metric, label: 'Tanah',  unit: '%',  r: 100, g: 75,  b: 35  },
  { key: 'ph'            as Metric, label: 'pH',     unit: '',   r: 130, g: 43,  b: 210 },
];


export default function MonitorScreen() {
  const insets = useSafeAreaInsets();

  const [nodes,       setNodes]       = useState<SensorNode[]>([]);
  const [activeNode,  setActiveNode]  = useState<SensorNode | null>(null);
  const [allReadings, setAllReadings] = useState<SensorReading[]>([]);
  const [period,      setPeriod]      = useState<Period>('1d');
  const [metric,      setMetric]      = useState<Metric>('temperature');
  const [nodeModal,   setNodeModal]   = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [aiInsight,        setAiInsight]        = useState<string>('');
  const [aiActions,        setAiActions]        = useState<string[]>([]);
  const [insightLoading,   setInsightLoading]   = useState(false);
  const [checked,          setChecked]          = useState<Record<number, boolean>>({});
  const latestReadingRef = useRef<SensorReading | null>(null);

  const limitForPeriod = (p: Period) => Math.ceil(PERIOD_HOURS[p] * 120) + 30;

  const load = useCallback(async (node: SensorNode, p: Period) => {
    try {
      const r = await sensorApi.getReadings(node.id, limitForPeriod(p));
      if (r.length > 0) {
        setAllReadings(r);
        latestReadingRef.current = r[0];
      }
    } catch (err: any) {
      if (__DEV__) console.error('[MonitorScreen] Failed to load sensor readings:', err);
    }
  }, []);

  const generateInsight = async () => {
    const reading = latestReadingRef.current ?? allReadings[0];
    if (!reading) return;
    setInsightLoading(true);
    try {
      const result = await aiApi.getSensorInsight({
        temperature: reading.temperature,
        humidity: reading.humidity,
        soil_moisture: reading.soil_moisture,
        ph: reading.ph,
      });
      if (result.insight) setAiInsight(result.insight);
      setAiActions(result.actions);
      setChecked({});
    } catch (err: any) {
      if (__DEV__) console.error('[MonitorScreen] Sensor insight fetch failed:', err?.message ?? err);
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    sensorApi.listNodes().then((n) => {
      if (n.length > 0) {
        setNodes(n);
        setActiveNode(n[0]);
        load(n[0], period);
      }
    }).catch((err: any) => {
      if (__DEV__) console.error('[MonitorScreen] Failed to list sensor nodes:', err?.message ?? err);
    });
  }, []);

  useEffect(() => {
    if (activeNode) load(activeNode, period);
  }, [period]);

  const onRefresh = async () => {
    if (!activeNode) return;
    setRefreshing(true);
    await load(activeNode, period);
    setRefreshing(false);
  };

  const selectNode = (node: SensorNode) => {
    setActiveNode(node);
    setNodeModal(false);
    load(node, period);
  };

  // Anchor cutoff to the latest reading so old stored data still displays
  const latestTime = allReadings.length > 0
    ? new Date(allReadings[0].recorded_at).getTime()
    : Date.now();
  const cutoff = latestTime - PERIOD_HOURS[period] * 3_600_000;

  const readings = allReadings
    .filter((r) => new Date(r.recorded_at).getTime() >= cutoff)
    .slice()
    .reverse(); // oldest → newest

  const activeMetric = METRIC_CFG.find((m) => m.key === metric) ?? METRIC_CFG[0];
  const { r: cr, g: cg, b: cb } = activeMetric;
  const metricColor = `rgb(${cr},${cg},${cb})`;

  // Downsample for chart (≤50 pts)
  const MAX_PTS = 50;
  const step = readings.length > MAX_PTS ? Math.ceil(readings.length / MAX_PTS) : 1;
  const sampled = readings.filter((_, i) => i % step === 0);

  const chartRawData = sampled.map((r) => (r[activeMetric.key] as number) ?? 0);
  const chartData = chartRawData.length > 0 ? chartRawData : [0];

  const labelEvery = Math.max(1, Math.floor(sampled.length / 5));
  const chartLabels = sampled.length > 0
    ? sampled.map((r, i) =>
        i % labelEvery === 0
          ? new Date(r.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : ''
      )
    : ['—'];

  // Stats
  const allValues = readings.map((r) => (r[activeMetric.key] as number) ?? 0).filter((v) => v > 0);
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 0;
  const avgVal = allValues.length > 0
    ? Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 10) / 10
    : 0;

  const latestReading = readings[readings.length - 1];
  const oldestReading = readings[0];
  const curVal = latestReading ? ((latestReading[activeMetric.key] as number) ?? 0) : 0;
  const prvVal = oldestReading ? ((oldestReading[activeMetric.key] as number) ?? curVal) : curVal;
  const changePct = prvVal !== 0
    ? Math.round(((curVal - prvVal) / Math.abs(prvVal)) * 100 * 10) / 10
    : 0;
  const decimals = activeMetric.key === 'ph' ? 2 : 1;

  const hasSensorData = allReadings.length > 0;
  const anomalyCount = allReadings.filter((r) => r.is_anomaly).length;
  const isAman = anomalyCount === 0;
  const lastUpdate = allReadings[0]
    ? new Date(allReadings[0].recorded_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e4719" />}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Lahan</Text>
          <Pressable style={styles.lahanPill} onPress={() => setNodeModal(true)}>
            <Text style={styles.lahanPillText} numberOfLines={1}>
              {activeNode?.name ?? 'Pilih Lahan'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#0e4719" />
          </Pressable>
        </View>

        {/* ── Period selector ── */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, p === period && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, p === period && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Metric selector ── */}
        <View style={styles.metricRow}>
          {METRIC_CFG.map((m) => {
            const active = m.key === metric;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.metricBtn, active && { backgroundColor: `rgb(${m.r},${m.g},${m.b})`, borderColor: `rgb(${m.r},${m.g},${m.b})` }]}
                onPress={() => setMetric(m.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricText, active && styles.metricTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Chart card ── */}
        <View style={[styles.chartCard, { width: CARD_W }]}>
          <LinearGradient
            style={StyleSheet.absoluteFillObject}
            colors={[`rgba(${cr},${cg},${cb},0.06)`, `rgba(${cr},${cg},${cb},0.16)`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          <LineChart
            data={{ labels: chartLabels, datasets: [{ data: chartData }] }}
            width={CARD_W}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientFromOpacity: 0,
              backgroundGradientTo: 'transparent',
              backgroundGradientToOpacity: 0,
              decimalPlaces: decimals,
              color: (opacity = 1) => `rgba(${cr},${cg},${cb},${opacity})`,
              labelColor: () => `rgba(${cr},${cg},${cb},0.65)`,
              propsForDots: { r: '2.5', strokeWidth: '1.5', stroke: metricColor },
              fillShadowGradient: metricColor,
              fillShadowGradientOpacity: 0.22,
              propsForLabels: { fontSize: 10 },
            }}
            bezier
            withInnerLines={false}
            withOuterLines={false}
            style={styles.lineChart}
          />
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {/* Current value — highlighted */}
          <View style={[styles.statCard, styles.statCardHighlight, { borderColor: metricColor }]}>
            <LinearGradient
              style={StyleSheet.absoluteFillObject}
              colors={[`rgba(${cr},${cg},${cb},0.12)`, `rgba(${cr},${cg},${cb},0.22)`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <Text style={[styles.statLabel, { color: metricColor }]}>Sekarang</Text>
            <Text style={[styles.statValLarge, { color: metricColor }]}>
              {curVal.toFixed(decimals)}{activeMetric.unit}
            </Text>
            <Text style={[styles.statChange, { color: changePct >= 0 ? '#d94e4e' : '#22c55e' }]}>
              {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct)}%
            </Text>
          </View>

          {/* Min / Avg / Max */}
          {[
            { label: 'Min', val: minVal },
            { label: 'Rata-rata', val: avgVal },
            { label: 'Maks', val: maxVal },
          ].map(({ label, val }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={[styles.statVal, { color: metricColor }]}>
                {val.toFixed(decimals)}{activeMetric.unit}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Last updated ── */}
        <Text style={styles.lastUpdated}>Terakhir diperbarui {lastUpdate}</Text>

        {/* ── Overview card ── */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewTitleRow}>
              <LinearGradient
                style={styles.overviewIcon}
                colors={['#ffd4a9', '#0e4719']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Ionicons name="leaf" size={16} color="#fff" />
              </LinearGradient>
              <Text style={styles.overviewTitle}>Overview</Text>
            </View>
            <LinearGradient
              style={styles.amanBadge}
              colors={isAman
                ? ['rgba(255,212,169,0.8)', 'rgba(200,240,201,0.8)']
                : ['rgba(255,212,169,0.8)', 'rgba(255,180,180,0.8)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.amanText}>{isAman ? 'Aman!' : 'Perhatian!'}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.overviewDesc}>
            {!hasSensorData
              ? 'Data sensor belum tersedia. Hubungkan node sensor atau aktifkan mode demo untuk melihat contoh data.'
              : isAman
              ? 'Kondisi lahan saat ini dalam batas normal. Suhu, kelembapan, dan pH tanah berada pada rentang optimal untuk pertumbuhan tanaman.'
              : `Terdeteksi ${anomalyCount} anomali pada pembacaan sensor. Segera periksa kondisi lahan dan ambil tindakan yang diperlukan.`}
          </Text>
          {/* AI Insight box */}
          <View style={styles.aiInsightBox}>
            <View style={styles.aiInsightHeader}>
              <LinearGradient
                style={styles.aiInsightIcon}
                colors={['#f7e8a0', '#0e4719']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="sparkles" size={12} color="#fff" />
              </LinearGradient>
              <Text style={styles.aiInsightLabel}>AI Insight</Text>
              <TouchableOpacity
                style={[styles.aiInsightBtn, insightLoading && styles.aiInsightBtnLoading]}
                onPress={generateInsight}
                disabled={insightLoading || !hasSensorData}
                activeOpacity={0.75}
              >
                {insightLoading ? (
                  <ActivityIndicator size={12} color="#fbf2d4" />
                ) : (
                  <Ionicons name="arrow-forward" size={12} color="#fbf2d4" />
                )}
                <Text style={styles.aiInsightBtnText}>
                  {insightLoading ? 'Generating...' : aiInsight ? 'Regenerate' : 'Generate'}
                </Text>
              </TouchableOpacity>
            </View>
            {aiInsight.length > 0 && (
              <Text style={styles.aiInsightText}>{aiInsight}</Text>
            )}
            {aiInsight.length === 0 && !insightLoading && (
              <Text style={styles.aiInsightEmpty}>
                Tekan Generate untuk mendapatkan analisis kondisi lahan dari AI.
              </Text>
            )}
          </View>
        </View>

        {/* ── Tindakan section — only shown after AI generates actions ── */}
        {aiActions.length > 0 && (
          <View style={styles.tindakanSection}>
            <Text style={styles.tindakanTitle}>Tindakan yang diperlukan:</Text>
            <View style={styles.tindakanList}>
              {aiActions.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.tindakanRow, checked[i] && styles.tindakanRowChecked]}
                  onPress={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                  activeOpacity={0.75}
                >
                  <View style={[styles.checkbox, checked[i] && styles.checkboxChecked]}>
                    {checked[i] && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.tindakanText, checked[i] && styles.tindakanTextChecked]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Node selector modal ── */}
      <Modal visible={nodeModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setNodeModal(false)}>
          <View style={styles.modalList} onStartShouldSetResponder={() => true}>
            <FlatList
              data={nodes}
              keyExtractor={(n) => n.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.id === activeNode?.id && styles.modalItemActive]}
                  onPress={() => selectNode(item)}
                >
                  <View style={[styles.nodeDot, { backgroundColor: item.is_active ? '#22c55e' : '#d94e4e' }]} />
                  <Text style={[styles.modalItemText, item.id === activeNode?.id && styles.modalItemTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffefb' },
  scrollContent: { paddingHorizontal: 14, gap: 13 },

  /* ── Header ── */
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  lahanPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between',
    maxWidth: 200, minWidth: 160, height: 43, borderRadius: 8, borderWidth: 1, borderColor: '#0e4719',
    backgroundColor: '#dbe3dd', paddingHorizontal: 12,
  },
  lahanPillText: { flex: 1, fontSize: 13, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },

  /* ── Period selector ── */
  periodRow: {
    alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 43, width: 228, borderRadius: 8, borderWidth: 1,
    borderColor: '#0e4719', backgroundColor: '#dbe3dd', padding: 4,
  },
  periodBtn: { width: 68, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  periodBtnActive: { backgroundColor: '#0e4719' },
  periodText: { fontSize: 16, fontFamily: 'FacultyGlyphic_400Regular', color: '#55835e' },
  periodTextActive: { color: '#fbf2d4' },

  /* ── Metric selector ── */
  metricRow: { flexDirection: 'row', gap: 8 },
  metricBtn: {
    flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#c5d3c6', backgroundColor: '#f0f4f1',
  },
  metricText: { fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#55835e' },
  metricTextActive: { color: '#fff' },

  /* ── Chart card ── */
  chartCard: { borderRadius: 16, overflow: 'hidden', position: 'relative', height: 200 },
  lineChart: { position: 'absolute', top: 0, left: 0 },

  /* ── Stats row ── */
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, borderRadius: 12, backgroundColor: '#f5f8f5', paddingVertical: 10,
    paddingHorizontal: 6, alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#e0e8e1', overflow: 'hidden',
  },
  statCardHighlight: {
    borderWidth: 1.5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  statLabel: { fontSize: 10, fontFamily: 'FacultyGlyphic_400Regular', color: '#7a9a7e' },
  statVal: { fontSize: 13, fontFamily: 'FacultyGlyphic_400Regular' },
  statValLarge: { fontSize: 17, fontFamily: 'FacultyGlyphic_400Regular', fontWeight: '700' },
  statChange: { fontSize: 10, fontFamily: 'FacultyGlyphic_400Regular' },

  /* ── Last updated ── */
  lastUpdated: {
    fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular',
    fontStyle: 'italic', color: '#0e4719', alignSelf: 'flex-end',
  },

  /* ── Overview card ── */
  overviewCard: {
    borderRadius: 12, backgroundColor: '#fefbf2',
    paddingLeft: 11, paddingTop: 12, paddingRight: 12, paddingBottom: 16, gap: 8,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  overviewHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  overviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  overviewIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  overviewTitle: { fontSize: 16, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  amanBadge: {
    height: 28, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1,
    borderColor: '#0d4c19', justifyContent: 'center', alignItems: 'center',
  },
  amanText: { fontSize: 14, fontFamily: 'FacultyGlyphic_400Regular', color: '#0d4c19' },
  overviewDesc: { fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719', lineHeight: 18 },
  aiInsightBox: { marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: '#eef6f0', gap: 8, borderWidth: 1, borderColor: '#d0e8d4' },
  aiInsightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiInsightIcon: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  aiInsightLabel: { flex: 1, fontSize: 13, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719', fontWeight: '600' },
  aiInsightBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0e4719', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  aiInsightBtnLoading: { backgroundColor: '#3a7042' },
  aiInsightBtnText: { fontSize: 11, fontFamily: 'FacultyGlyphic_400Regular', color: '#fbf2d4' },
  aiInsightText: { fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#1a3d1f', lineHeight: 18 },
  aiInsightEmpty: { fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#7a9a7e', fontStyle: 'italic', lineHeight: 17 },

  /* ── Tindakan ── */
  tindakanSection: { gap: 12 },
  tindakanTitle: { fontSize: 16, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  tindakanList: { gap: 10 },
  tindakanRow: {
    borderRadius: 8, backgroundColor: '#eaf3ec',
    paddingHorizontal: 13, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  tindakanRowChecked: { backgroundColor: '#c8e6cc' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: '#0e4719', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#0e4719', borderColor: '#0e4719' },
  tindakanText: { flex: 1, fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#000', lineHeight: 18 },
  tindakanTextChecked: { color: '#4a7a52' },

  /* ── Node modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalList: {
    backgroundColor: '#fff', borderRadius: 12, width: 240, maxHeight: 200,
    overflow: 'hidden', elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f3f0',
  },
  modalItemActive: { backgroundColor: '#f0f3f0' },
  nodeDot: { width: 8, height: 8, borderRadius: 4 },
  modalItemText: { fontSize: 15, fontFamily: 'FacultyGlyphic_400Regular', color: '#1e3c22' },
  modalItemTextActive: { color: '#0e4719', fontWeight: '700' },
});
