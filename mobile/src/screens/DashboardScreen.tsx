import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, FlatList, Pressable, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import {
  getCommodityList,
  getCommodityPriceHistory,
  type CommodityPriceHistory,
} from '../services/commodityService';
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

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Commodity
  const [commodities,  setCommodities]  = useState<string[]>([]);
  const [selected,     setSelected]     = useState<string>('');
  const [history,      setHistory]      = useState<CommodityPriceHistory | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading,      setLoading]      = useState(false);

  // Sensor
  const [node,    setNode]    = useState<SensorNode | null>(null);
  const [reading, setReading] = useState<SensorReading | null>(null);

  useEffect(() => {
    getCommodityList().then((list) => {
      setCommodities(list);
      if (list.length > 0) setSelected(list[0]);
    });
    sensorApi.listNodes().then((nodes) => {
      if (nodes.length > 0) {
        setNode(nodes[0]);
        sensorApi.getReadings(nodes[0].id, 1).then((r) => setReading(r[0] ?? null));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getCommodityPriceHistory(selected)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [selected]);

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  const chartLabels = history?.data.map((d) => d.date) ?? [];
  const chartPrices = history?.data.map((d) => d.price) ?? [0];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greetingByHour()}!</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={20} color="#0e4719" />
          </TouchableOpacity>
        </View>

        {/* ── Balance card ── */}
        <View style={[styles.balanceCard, { width: CARD_W }]}>
          <LinearGradient
            style={StyleSheet.absoluteFillObject}
            colors={['#1a5e2a', '#0e4719']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceLabel}>Saldo Anda</Text>
            <Text style={styles.balanceAmount}>Rp20.140.340</Text>
          </View>
          <TouchableOpacity style={styles.keuanganBtn} activeOpacity={0.8}>
            <Ionicons name="card-outline" size={20} color="#44694b" />
            <Text style={styles.keuanganText}>Keuangan</Text>
          </TouchableOpacity>
        </View>

        {/* ── Sensor card ── */}
        <View style={[styles.sensorCard, { width: CARD_W }]}>
          <LinearGradient
            style={StyleSheet.absoluteFillObject}
            colors={['#e7ede8', '#f5faf5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.sensorHeader}>
            <View style={styles.sensorTitleRow}>
              <LinearGradient
                style={styles.sensorIcon}
                colors={['#ffd4a9', '#0e4719']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <Ionicons name="leaf" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.sensorTitle}>Monitor Tanaman</Text>
            </View>
            {node && (
              <View style={styles.nodePill}>
                <View style={[styles.nodeDot, { backgroundColor: node.is_active ? '#22c55e' : '#d94e4e' }]} />
                <Text style={styles.nodePillText}>{node.name.replace(/ \(.*\)$/, '')}</Text>
              </View>
            )}
          </View>

          {reading?.is_anomaly && (
            <View style={styles.anomalyBanner}>
              <Ionicons name="warning" size={13} color="#b91c1c" />
              <Text style={styles.anomalyText} numberOfLines={2}>{reading.anomaly_description}</Text>
            </View>
          )}

          <View style={styles.metricGrid}>
            {METRICS.map((m) => {
              const raw = reading ? reading[m.key] : null;
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

          <TouchableOpacity
            style={styles.monitorLink}
            onPress={() => navigation.navigate('Monitor')}
            activeOpacity={0.8}
          >
            <Text style={styles.monitorLinkText}>Lihat detail di Monitor</Text>
            <Ionicons name="arrow-forward" size={13} color="#0e4719" />
          </TouchableOpacity>
        </View>

        {/* ── Commodity price section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Harga Terkini</Text>
          <Pressable style={styles.commodityPill} onPress={() => setDropdownOpen(true)}>
            <Text style={styles.commodityPillText}>{selected || 'Komoditas'}</Text>
            <Ionicons name="chevron-down" size={14} color="#0e4719" />
          </Pressable>
        </View>

        <View style={[styles.chartCard, { width: CARD_W }]}>
          <LinearGradient
            style={StyleSheet.absoluteFillObject}
            colors={['#e7ede8', '#d3dcd3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {loading ? (
            <ActivityIndicator style={styles.chartLoader} size="large" color="#0e4719" />
          ) : history ? (
            <View style={styles.chartInner}>
              <View style={styles.chartTopRow}>
                <View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmount}>
                      Rp{history.currentPrice.toLocaleString('id-ID')}
                    </Text>
                    <Text style={styles.priceUnit}>/kg</Text>
                  </View>
                  <Text style={styles.chartSubtitle}>{selected}</Text>
                </View>
                <View style={styles.changeRow}>
                  <Ionicons
                    name={history.changePercent >= 0 ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={history.changePercent >= 0 ? '#d94e4e' : '#22c55e'}
                  />
                  <Text style={[styles.changeText, { color: history.changePercent >= 0 ? '#d94e4e' : '#22c55e' }]}>
                    {history.changePercent >= 0 ? '+' : ''}{history.changePercent}%
                  </Text>
                </View>
              </View>
              <LineChart
                data={{ labels: chartLabels, datasets: [{ data: chartPrices }] }}
                width={CARD_W}
                height={170}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: 'transparent',
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientTo: 'transparent',
                  backgroundGradientToOpacity: 0,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(14,71,25,${opacity})`,
                  labelColor: () => 'rgba(14,71,25,0.6)',
                  propsForDots: { r: '2.5', strokeWidth: '1.5', stroke: '#0e4719' },
                  fillShadowGradient: '#0e4719',
                  fillShadowGradientOpacity: 0.22,
                  propsForLabels: { fontSize: 9 },
                }}
                bezier
                withInnerLines={false}
                withOuterLines={false}
                style={styles.lineChart}
              />
            </View>
          ) : (
            <Text style={styles.chartEmpty}>Pilih komoditas untuk melihat harga</Text>
          )}
        </View>
      </ScrollView>

      {/* ── Commodity dropdown modal ── */}
      <Modal visible={dropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownOpen(false)}>
          <View style={styles.dropdownList} onStartShouldSetResponder={() => true}>
            <FlatList
              data={commodities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, item === selected && styles.dropdownItemActive]}
                  onPress={() => { setSelected(item); setDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, item === selected && styles.dropdownItemTextActive]}>
                    {item}
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
  scroll: { paddingHorizontal: 14, gap: 14 },

  /* ── Header ── */
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 36, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  date: { fontSize: 14, fontFamily: 'FacultyGlyphic_400Regular', color: '#55835e', marginTop: 3 },
  profileBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#dbe3dd',
    borderWidth: 1, borderColor: '#0e4719', alignItems: 'center', justifyContent: 'center',
  },

  /* ── Balance card ── */
  balanceCard: {
    borderRadius: 16, overflow: 'hidden', padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  balanceLeft: { gap: 4 },
  balanceLabel: { fontSize: 13, fontFamily: 'FacultyGlyphic_400Regular', color: 'rgba(251,242,212,0.8)', fontStyle: 'italic' },
  balanceAmount: { fontSize: 24, fontFamily: 'FacultyGlyphic_400Regular', color: '#fbf2d4', fontWeight: '600' },
  keuanganBtn: {
    alignItems: 'center', gap: 6,
    backgroundColor: '#fbf2d4', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  keuanganText: { fontSize: 11, fontFamily: 'FacultyGlyphic_400Regular', color: '#44694b', fontWeight: '600' },

  /* ── Sensor card ── */
  sensorCard: {
    borderRadius: 16, overflow: 'hidden', padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#ccd9ce',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  sensorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sensorTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sensorIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sensorTitle: { fontSize: 15, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  nodePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#dbe3dd', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#0e4719',
  },
  nodeDot: { width: 7, height: 7, borderRadius: 4 },
  nodePillText: { fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  anomalyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
  },
  anomalyText: { flex: 1, fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#b91c1c', lineHeight: 17 },
  metricGrid: { flexDirection: 'row', gap: 8 },
  metricPill: {
    flex: 1,
    borderRadius: 12, overflow: 'hidden', borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 8, gap: 3, alignItems: 'center',
  },
  metricVal: { fontSize: 16, fontFamily: 'FacultyGlyphic_400Regular', fontWeight: '700' },
  metricLabel: { fontSize: 10, fontFamily: 'FacultyGlyphic_400Regular' },
  monitorLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end',
  },
  monitorLinkText: { fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },

  /* ── Section header ── */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },
  commodityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#dbe3dd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#0e4719', maxWidth: 180,
  },
  commodityPillText: { flex: 1, fontSize: 13, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719' },

  /* ── Chart card ── */
  chartCard: {
    borderRadius: 16, overflow: 'hidden', minHeight: 200,
    borderWidth: 1, borderColor: '#ccd9ce',
  },
  chartInner: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: 6, gap: 8 },
  chartTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  priceAmount: { fontSize: 24, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719', fontWeight: '600' },
  priceUnit: { fontSize: 14, fontFamily: 'FacultyGlyphic_400Regular', color: '#0e4719', paddingBottom: 2 },
  chartSubtitle: { fontSize: 12, fontFamily: 'FacultyGlyphic_400Regular', color: '#55835e', marginTop: 2 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeText: { fontSize: 14, fontFamily: 'FacultyGlyphic_400Regular', fontWeight: '700' },
  lineChart: { marginTop: 4 },
  chartLoader: { padding: 48 },
  chartEmpty: {
    textAlign: 'center', padding: 48,
    fontSize: 13, fontFamily: 'FacultyGlyphic_400Regular', color: '#7a9a7e',
  },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  dropdownList: {
    backgroundColor: '#fff', borderRadius: 12, width: 280, maxHeight: 260,
    overflow: 'hidden', elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  dropdownItem: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f3f0',
  },
  dropdownItemActive: { backgroundColor: '#f0f3f0' },
  dropdownItemText: { fontSize: 15, fontFamily: 'FacultyGlyphic_400Regular', color: '#1e3c22' },
  dropdownItemTextActive: { color: '#0e4719', fontWeight: '700' },
});
