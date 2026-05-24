import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

interface SensorReading {
  suhuUdara: string;
  kelembapan: string;
  phTanah: string;
}

interface DiagnosisHistoryItem {
  id: string;
  cropName: string;
  date: string;
  createdAt: string;
  status: 'Selesai';
  description: string;
  sensors: SensorReading;
  result?: any;
  imageUri?: string;
  ai_insight?: string;
}

interface DiagnosisRecord {
  id: string;
  farmer_id: string;
  image_url: string;
  disease_name: string | null;
  confidence: number | null;
  recommendation: string | null;
  ai_insight: string | null;
  created_at: string;
}

type HealthFilter = 'all' | 'healthy' | 'sick';
type SortOrder  = 'newest' | 'oldest';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function extractPlantName(diseaseName: string | null): string {
  if (!diseaseName) return 'Tidak Teridentifikasi';
  const match = diseaseName.match(/\(([^)]+)\)$/);
  if (match) return match[1];
  const lc = diseaseName.toLowerCase();
  if (lc === 'healthy' || lc === 'sehat') return 'Tanaman Sehat';
  return diseaseName;
}

function mapRecord(record: DiagnosisRecord): DiagnosisHistoryItem {
  return {
    id: record.id,
    cropName: extractPlantName(record.disease_name),
    date: formatDate(record.created_at),
    createdAt: record.created_at,
    status: 'Selesai',
    description: record.recommendation ?? '-',
    sensors: { suhuUdara: '-', kelembapan: '-', phTanah: '-' },
    result: {
      disease_name: record.disease_name ?? '',
      confidence: record.confidence ?? 0,
      is_healthy: record.disease_name === 'Healthy' || record.disease_name === 'Sehat',
      recommendation: record.recommendation ?? '',
    },
    imageUri: record.image_url || undefined,
    ai_insight: record.ai_insight ?? undefined,
  };
}

export default function DiagnosisScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<DiagnosisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery]   = useState('');
  const [filterHealth, setFilterHealth] = useState<HealthFilter>('all');
  const [sortOrder, setSortOrder]       = useState<SortOrder>('newest');
  const [filterVisible, setFilterVisible] = useState(false);

  // Temporary state for the modal (apply on close)
  const [tempHealth, setTempHealth] = useState<HealthFilter>('all');
  const [tempSort, setTempSort]     = useState<SortOrder>('newest');

  const isFiltered = filterHealth !== 'all' || sortOrder !== 'newest';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      api.get('/ai/diagnoses')
        .then((res) => {
          if (active && Array.isArray(res.data)) setItems(res.data.map(mapRecord));
        })
        .catch((err: any) => {
          if (__DEV__) console.error("🔧 [DiagnosisScreen] Failed to load:", err?.message ?? err);
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const displayedItems = useMemo(() => {
    let result = [...items];

    // Health filter
    if (filterHealth === 'healthy') result = result.filter(i => i.result?.is_healthy);
    if (filterHealth === 'sick')    result = result.filter(i => !i.result?.is_healthy);

    // Search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(i =>
        i.cropName.toLowerCase().includes(q) ||
        (i.result?.disease_name ?? '').toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === 'newest' ? diff : -diff;
    });

    return result;
  }, [items, filterHealth, searchQuery, sortOrder]);

  const openFilter = () => {
    setTempHealth(filterHealth);
    setTempSort(sortOrder);
    setFilterVisible(true);
  };

  const applyFilter = () => {
    setFilterHealth(tempHealth);
    setSortOrder(tempSort);
    setFilterVisible(false);
  };

  const resetFilter = () => {
    setTempHealth('all');
    setTempSort('newest');
  };

  return (
    <View style={styles.container}>
      {/* Decorative */}
      <LinearGradient
        style={styles.decoGradient}
        colors={['rgba(113, 175, 125, 0)', '#0e4719']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Image style={{ width: '100%', height: '100%' }} resizeMode="cover" source={require('../../assets/images/deco-right.png')} />
      </LinearGradient>
      <Image style={styles.decoPlant} resizeMode="cover" source={require('../../assets/images/dashboard-plant.png')} />

      {/* Header */}
      <View style={[styles.headerArea, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Riwayat</Text>

        {/* Search + Filter row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#6a8f72" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama tanaman atau penyakit..."
              placeholderTextColor="#aab8ac"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#aab8ac" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterBtn, isFiltered && styles.filterBtnActive]}
            onPress={openFilter}
            activeOpacity={0.75}
          >
            <Ionicons name="options-outline" size={18} color={isFiltered ? '#fff' : '#0e4719'} />
            {isFiltered && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {isFiltered && (
          <View style={styles.chipRow}>
            {filterHealth !== 'all' && (
              <TouchableOpacity style={styles.chip} onPress={() => setFilterHealth('all')}>
                <Text style={styles.chipText}>{filterHealth === 'healthy' ? 'Sehat' : 'Sakit'}</Text>
                <Ionicons name="close" size={12} color="#0e4719" />
              </TouchableOpacity>
            )}
            {sortOrder !== 'newest' && (
              <TouchableOpacity style={styles.chip} onPress={() => setSortOrder('newest')}>
                <Text style={styles.chipText}>Terlama</Text>
                <Ionicons name="close" size={12} color="#0e4719" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Card list */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#0e4719" />
        </View>
      ) : displayedItems.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="leaf-outline" size={48} color="#b4c6b8" />
          <Text style={styles.emptyText}>
            {items.length === 0 ? 'Belum ada riwayat diagnosis' : 'Tidak ada hasil yang cocok'}
          </Text>
          {items.length > 0 && (searchQuery || isFiltered) && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setFilterHealth('all'); setSortOrder('newest'); }}>
              <Text style={styles.resetText}>Reset pencarian & filter</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {displayedItems.map((item) => (
            <DiagnosisCard
              key={item.id}
              item={item}
              onPress={() => {
                navigation.navigate('DiagnosisDetail', {
                  result: item.result ?? { disease_name: 'Healthy', confidence: 1, is_healthy: true, recommendation: '' },
                  imageUri: item.imageUri ?? '',
                  sensorData: undefined,
                  insight: item.ai_insight ?? '',
                });
              }}
            />
          ))}
        </ScrollView>
      )}

      {/* Filter bottom sheet */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterVisible(false)}>
          <TouchableOpacity style={styles.filterSheet} activeOpacity={1}>
            {/* Handle */}
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter & Urutkan</Text>

            {/* Health section */}
            <Text style={styles.sectionLabel}>Kesehatan Tanaman</Text>
            <View style={styles.optionRow}>
              {([['all', 'Semua'], ['healthy', 'Sehat'], ['sick', 'Sakit']] as [HealthFilter, string][]).map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.optionBtn, tempHealth === val && styles.optionBtnActive]}
                  onPress={() => setTempHealth(val)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.optionText, tempHealth === val && styles.optionTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort section */}
            <Text style={styles.sectionLabel}>Urutkan</Text>
            <View style={styles.optionRow}>
              {([['newest', 'Terbaru'], ['oldest', 'Terlama']] as [SortOrder, string][]).map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.optionBtn, tempSort === val && styles.optionBtnActive]}
                  onPress={() => setTempSort(val)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.optionText, tempSort === val && styles.optionTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilter} activeOpacity={0.75}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilter} activeOpacity={0.85}>
                <Text style={styles.applyBtnText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function DiagnosisCard({ item, onPress }: { item: DiagnosisHistoryItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['#fefdf9', '#d9eedc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.badge, styles.badgeSelesai]}>
        <Text style={[styles.badgeText, styles.badgeTextSelesai]}>Selesai</Text>
      </View>

      <View style={styles.cardTopLeft}>
        <Text style={styles.cardCrop}>{item.cropName}</Text>
        <Text style={styles.cardDate}>{item.date}</Text>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.cardDesc} numberOfLines={5}>{item.description}</Text>
        <View style={styles.sensorPanel}>
          <View style={styles.sensorRow}>
            <Text style={styles.sensorLabel}>Suhu udara</Text>
            <Text style={styles.sensorValue}>{item.sensors.suhuUdara}</Text>
          </View>
          <View style={styles.sensorDivider} />
          <View style={styles.sensorRow}>
            <Text style={styles.sensorLabel}>Kelembapan</Text>
            <Text style={styles.sensorValue}>{item.sensors.kelembapan}</Text>
          </View>
          <View style={styles.sensorDivider} />
          <View style={styles.sensorRow}>
            <Text style={styles.sensorLabel}>pH Tanah</Text>
            <Text style={styles.sensorValue}>{item.sensors.phTanah}</Text>
          </View>
          <View style={styles.sensorDivider} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffefb',
    overflow: 'hidden',
  },

  /* ── Decorative ── */
  decoGradient: {
    position: 'absolute',
    left: 225,
    top: -127,
    width: 180,
    height: 220,
  },
  decoPlant: {
    position: 'absolute',
    top: -109,
    left: 246,
    width: 203,
    height: 247,
  },

  /* ── Header ── */
  headerArea: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    marginBottom: 10,
  },

  /* Search row */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eef3ef',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c2d4c5',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    padding: 0,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0e4719',
    backgroundColor: '#dbe3dd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#0e4719',
    borderColor: '#0e4719',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#a0e4a8',
  },

  /* Active filter chips */
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1f2d7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },

  /* ── Center state ── */
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#b4c6b8',
  },
  resetText: {
    fontSize: 13,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    textDecorationLine: 'underline',
  },

  /* ── Scroll ── */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 13,
  },

  /* ── Card ── */
  card: {
    height: 153,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b4c6b8',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 253,
    width: 111,
    height: 37,
    borderBottomLeftRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSelesai: { backgroundColor: '#d1f2d7' },
  badgeText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
  },
  badgeTextSelesai: { color: '#0e4719' },
  cardTopLeft: {
    position: 'absolute',
    top: 9,
    left: 11,
    gap: 2,
  },
  cardCrop: {
    fontSize: 20,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  cardDate: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  cardBottom: {
    position: 'absolute',
    top: 55,
    left: 11,
    width: 340,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardDesc: {
    width: 175,
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    lineHeight: 16,
  },
  sensorPanel: {
    width: 141,
    gap: 6,
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sensorLabel: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  sensorValue: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  sensorDivider: {
    height: 1,
    backgroundColor: '#000',
    alignSelf: 'stretch',
  },

  /* ── Filter modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#fffefb',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#c2d4c5',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#6a8f72',
    marginBottom: -8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c2d4c5',
    backgroundColor: '#eef3ef',
  },
  optionBtnActive: {
    backgroundColor: '#0e4719',
    borderColor: '#0e4719',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  optionTextActive: {
    color: '#fbf2d4',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c2d4c5',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 15,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0e4719',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#fbf2d4',
  },
});
