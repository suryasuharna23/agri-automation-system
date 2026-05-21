import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Modal, FlatList, Pressable, RefreshControl, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sensorApi, aiApi } from '../services/api';
import type { SensorNode, SensorReading } from '../types';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W   = SCREEN_W - 28;   // 14px margin each side

type Period = '1h' | '5h' | '1d';
const PERIODS: Period[] = ['1h', '5h', '1d'];
const PERIOD_HOURS: Record<Period, number> = { '1h': 1, '5h': 5, '1d': 24 };

const TINDAKAN = [
  'Pastikan kelembapan tanah di kisaran 60–70% untuk mendukung pertumbuhan optimal.',
  'Cek kondisi nutrisi larutan hidroponik, EC di kisaran 1.5–2.0 mS/cm.',
  'Periksa filter sistem irigasi dan bersihkan jika tersumbat.',
];

const MOCK_NODE: SensorNode = { id: 'mock', name: 'Lahan 1', is_active: true } as any;

function genMockReadings(count: number): SensorReading[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    node_id: 'mock',
    temperature:    Math.round((25 + Math.sin(i * 0.7) * 3) * 10) / 10,
    humidity:       Math.round((60 + Math.sin(i * 0.4) * 10) * 10) / 10,
    soil_moisture:  Math.round((55 + Math.sin(i * 0.3) * 8) * 10) / 10,
    ph:             Math.round((6.2 + Math.sin(i * 0.5) * 0.3) * 10) / 10,
    recorded_at:    new Date(Date.now() - i * 1800000).toISOString(),
    is_anomaly:     false,
    anomaly_description: null,
  } as SensorReading));
}

export default function MonitorScreen() {
  const insets = useSafeAreaInsets();

  const [nodes,       setNodes]       = useState<SensorNode[]>([MOCK_NODE]);
  const [activeNode,  setActiveNode]  = useState<SensorNode>(MOCK_NODE);
  const [allReadings, setAllReadings] = useState<SensorReading[]>(genMockReadings(20));
  const [period,      setPeriod]      = useState<Period>('1h');
  const [nodeModal,   setNodeModal]   = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [aiInsight,   setAiInsight]   = useState<string>('');

  const load = useCallback(async (node: SensorNode) => {
    try {
      const r = await sensorApi.getReadings(node.id, 24);
      if (r.length > 0) {
        setAllReadings(r);
        // Fetch AI insight based on latest reading (non-blocking)
        const latest = r[0];
        aiApi.getSensorInsight({
          temperature: latest.temperature,
          humidity: latest.humidity,
          soil_moisture: latest.soil_moisture,
          ph: latest.ph,
        }).then((insight) => {
          if (insight) setAiInsight(insight);
        }).catch((err: any) => {
          console.error("🔧 [MonitorScreen] Sensor insight fetch failed:", err?.message ?? err);
        });
      }
    } catch (err: any) {
      console.error("🔧 [MonitorScreen] Failed to load sensor readings:", err);
    }
  }, []);

  useEffect(() => {
    sensorApi.listNodes().then((n) => {
      if (n.length > 0) {
        setNodes(n);
        setActiveNode(n[0]);
        load(n[0]);
      }
    }).catch((err: any) => {
      console.error("🔧 [MonitorScreen] Failed to list sensor nodes:", err?.message ?? err);
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(activeNode);
    setRefreshing(false);
  };

  const selectNode = (node: SensorNode) => {
    setActiveNode(node);
    setNodeModal(false);
    load(node);
  };

  // Filter readings by selected period
  const cutoff = Date.now() - PERIOD_HOURS[period] * 3_600_000;
  const readings = allReadings
    .filter((r) => new Date(r.recorded_at).getTime() >= cutoff)
    .slice()
    .reverse();

  // Chart data (temperature)
  const chartData = readings.length > 0
    ? readings.map((r) => r.temperature ?? 0)
    : [0];

  const chartLabels = readings.length > 0
    ? readings.map((r) =>
        new Date(r.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      ).filter((_, i) => i % Math.max(1, Math.floor(readings.length / 4)) === 0)
    : ['—'];

  const latest   = readings[readings.length - 1];
  const oldest   = readings[0];
  const curTemp  = latest?.temperature ?? 0;
  const prvTemp  = oldest?.temperature ?? curTemp;
  const changePct = prvTemp !== 0 ? Math.round(((curTemp - prvTemp) / prvTemp) * 100 * 10) / 10 : 0;

  const anomalyCount = allReadings.filter((r) => r.is_anomaly).length;
  const isAman = anomalyCount === 0;

  const lastUpdate = latest
    ? new Date(latest.recorded_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0e4719" />}
      >
        {/* ── Header row ── */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Lahan</Text>
          <Pressable style={styles.lahanPill} onPress={() => setNodeModal(true)}>
            <Text style={styles.lahanPillText}>{activeNode.name}</Text>
            <Ionicons name="chevron-down" size={16} color="#0e4719" />
          </Pressable>
        </View>

        {/* ── Time period selector ── */}
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

        {/* ── Chart card ── */}
        <View style={[styles.chartCard, { width: CARD_W }]}>
          <LinearGradient
            style={StyleSheet.absoluteFillObject}
            colors={['rgba(231,237,232,0)', '#e7ede8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Value overlay — top right */}
          <View style={styles.chartValueBox}>
            <View style={styles.chartPriceRow}>
              <Text style={styles.chartMainVal}>{curTemp}°</Text>
              <Text style={styles.chartUnit}>C</Text>
            </View>
            <View style={styles.chartChangeRow}>
              <Text style={[styles.chartChangePct, { color: changePct >= 0 ? '#d94e4e' : '#22c55e' }]}>
                {changePct >= 0 ? '+' : ''}{changePct}%
              </Text>
              <Image
                style={styles.iconIncrease}
                resizeMode="cover"
                source={require('../../assets/icons/icon-increase.png')}
              />
            </View>
          </View>

          {/* Line chart */}
          <LineChart
            data={{ labels: chartLabels, datasets: [{ data: chartData }] }}
            width={CARD_W - 120}
            height={157}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: '#e7ede8',
              backgroundGradientTo: '#e7ede8',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(14, 71, 25, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(14, 71, 25, ${opacity})`,
              propsForDots: { r: '3', strokeWidth: '1', stroke: '#0e4719' },
            }}
            bezier
            withInnerLines={false}
            style={styles.lineChart}
          />
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
            {isAman
              ? 'Kondisi lahan saat ini dalam batas normal. Suhu, kelembapan, dan pH tanah berada pada rentang optimal untuk pertumbuhan tanaman.'
              : `Terdeteksi ${anomalyCount} anomali pada pembacaan sensor. Segera periksa kondisi lahan dan ambil tindakan yang diperlukan.`}
          </Text>
          {aiInsight.length > 0 && (
            <View style={styles.aiInsightBox}>
              <View style={styles.aiInsightHeader}>
                <Ionicons name="sparkles-outline" size={14} color="#0e4719" />
                <Text style={styles.aiInsightLabel}>AI Insight</Text>
              </View>
              <Text style={styles.aiInsightText}>{aiInsight}</Text>
            </View>
          )}
        </View>

        {/* ── Tindakan section ── */}
        <View style={styles.tindakanSection}>
          <Text style={styles.tindakanTitle}>Tindakan yang diperlukan:</Text>
          <View style={styles.tindakanList}>
            {TINDAKAN.map((item, i) => (
              <View key={i} style={styles.tindakanRow}>
                <Text style={styles.tindakanText} numberOfLines={2}>{item}</Text>
                <View style={styles.tindakanBtn}>
                  <Ionicons name="chevron-forward" size={14} color="#0e4719" />
                </View>
              </View>
            ))}
          </View>
        </View>
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
                  style={[styles.modalItem, item.id === activeNode.id && styles.modalItemActive]}
                  onPress={() => selectNode(item)}
                >
                  <View style={[styles.nodeDot, { backgroundColor: item.is_active ? '#22c55e' : '#d94e4e' }]} />
                  <Text style={[styles.modalItemText, item.id === activeNode.id && styles.modalItemTextActive]}>
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
  container: {
    flex: 1,
    backgroundColor: '#fffefb',
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 13,
  },

  /* ── Header ── */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  lahanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    justifyContent: 'space-between',
    width: 100,
    height: 43,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0e4719',
    backgroundColor: '#dbe3dd',
    paddingHorizontal: 12,
  },
  lahanPillText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },

  /* ── Period selector ── */
  periodRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 43,
    width: 228,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0e4719',
    backgroundColor: '#dbe3dd',
    padding: 4,
  },
  periodBtn: {
    width: 68,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#0e4719',
  },
  periodText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#55835e',
  },
  periodTextActive: {
    color: '#fbf2d4',
  },

  /* ── Chart card ── */
  chartCard: {
    height: 195,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  chartValueBox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 110,
    gap: 4,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  chartPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  chartMainVal: {
    fontSize: 24,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  chartUnit: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    paddingBottom: 2,
  },
  chartChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartChangePct: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
  },
  iconIncrease: {
    width: 20,
    height: 20,
  },
  lineChart: {
    position: 'absolute',
    top: 33,
    left: 8,
  },

  /* ── Last updated ── */
  lastUpdated: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    fontStyle: 'italic',
    color: '#0e4719',
    alignSelf: 'flex-end',
  },

  /* ── Overview card ── */
  overviewCard: {
    borderRadius: 12,
    backgroundColor: '#fefbf2',
    paddingLeft: 11,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 16,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  overviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  overviewIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitle: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  amanBadge: {
    height: 28,
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0d4c19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amanText: {
    fontSize: 14,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0d4c19',
  },
  overviewDesc: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    lineHeight: 18,
  },
  aiInsightBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#eef6f0',
    gap: 4,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiInsightLabel: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    fontWeight: '600',
  },
  aiInsightText: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#1a3d1f',
    lineHeight: 17,
  },

  /* ── Tindakan ── */
  tindakanSection: {
    gap: 12,
  },
  tindakanTitle: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  tindakanList: {
    gap: 12,
  },
  tindakanRow: {
    height: 47,
    borderRadius: 8,
    backgroundColor: '#eaf3ec',
    paddingLeft: 13,
    paddingTop: 9,
    paddingBottom: 10,
    paddingRight: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tindakanText: {
    width: 285,
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#000',
    lineHeight: 16,
  },
  tindakanBtn: {
    width: 36,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0e4719',
    backgroundColor: '#fefdf9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Node modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 240,
    maxHeight: 200,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f3f0',
  },
  modalItemActive: {
    backgroundColor: '#f0f3f0',
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalItemText: {
    fontSize: 15,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#1e3c22',
  },
  modalItemTextActive: {
    color: '#0e4719',
    fontWeight: '700',
  },
});
