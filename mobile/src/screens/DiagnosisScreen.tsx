import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  status: 'Diproses' | 'Selesai';
  description: string;
  sensors: SensorReading;
  result?: any;
  imageUri?: string;
}

const MOCK_ITEMS: DiagnosisHistoryItem[] = [
  {
    id: '1',
    cropName: 'Kangkung',
    date: '28 Feb 2026',
    status: 'Diproses',
    description: 'Daun menunjukkan bercak kuning kecoklatan pada permukaan atas. Gejala belum dapat dikonfirmasi, sedang dianalisis oleh sistem.',
    sensors: { suhuUdara: '27°', kelembapan: '50%', phTanah: '5.3' },
  },
  {
    id: '2',
    cropName: 'Bayam',
    date: '26 Feb 2026',
    status: 'Diproses',
    description: 'Terdeteksi perubahan warna pada batang bagian bawah. Analisis sedang berlangsung untuk mengidentifikasi jenis penyakit.',
    sensors: { suhuUdara: '29°', kelembapan: '62%', phTanah: '6.1' },
  },
  {
    id: '3',
    cropName: 'Kangkung',
    date: '20 Feb 2026',
    status: 'Selesai',
    description: 'Terdeteksi Downy Mildew pada daun. Disarankan untuk mengurangi kelembapan dan menyemprotkan fungisida berbasis tembaga.',
    sensors: { suhuUdara: '25°', kelembapan: '78%', phTanah: '5.8' },
    result: {
      disease_name: 'Downy Mildew',
      confidence: 0.87,
      is_healthy: false,
      recommendation: 'Kurangi kelembapan, perbaiki sirkulasi udara, dan semprotkan fungisida berbasis tembaga setiap 7 hari.',
    },
  },
  {
    id: '4',
    cropName: 'Tomat',
    date: '15 Feb 2026',
    status: 'Selesai',
    description: 'Tanaman sehat. Tidak ditemukan gejala penyakit. Pertahankan kondisi lingkungan saat ini dan jadwal pemupukan rutin.',
    sensors: { suhuUdara: '28°', kelembapan: '55%', phTanah: '6.5' },
    result: {
      disease_name: 'Healthy',
      confidence: 0.94,
      is_healthy: true,
      recommendation: 'Tanaman sehat. Pertahankan kondisi lingkungan dan jadwal pemupukan rutin.',
    },
  },
];

export default function DiagnosisScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<DiagnosisHistoryItem[]>(MOCK_ITEMS);

  useEffect(() => {
    api.get('/diagnoses').then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) setItems(res.data);
    }).catch((err: any) => {
      console.error("🔧 [DiagnosisScreen] Failed to load diagnosis history:", err?.message ?? err);
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Decorative top-right */}
      <LinearGradient
        style={styles.decoGradient}
        colors={['rgba(113, 175, 125, 0)', '#0e4719']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Image
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          source={require('../../assets/images/deco-right.png')}
        />
      </LinearGradient>
      <Image
        style={styles.decoPlant}
        resizeMode="cover"
        source={require('../../assets/images/dashboard-plant.png')}
      />

      {/* Header */}
      <View style={[styles.headerArea, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Riwayat</Text>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.75}>
          <Text style={styles.filterText}>Filter</Text>
          <Ionicons name="options-outline" size={16} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Card list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <DiagnosisCard
            key={item.id}
            item={item}
            onPress={() => {
              if (item.status === 'Selesai') {
                const rawTemp = item.sensors?.suhuUdara?.replace(/[^\d.]/g, '') ?? '';
                const rawPh = item.sensors?.phTanah?.replace(/[^\d.]/g, '') ?? '';
                const rawHumidity = item.sensors?.kelembapan?.replace(/[^\d.]/g, '') ?? '';
                const parsedTemp = parseFloat(rawTemp);
                const parsedPh = parseFloat(rawPh);
                const parsedHumidity = parseFloat(rawHumidity);
                navigation.navigate('DiagnosisDetail', {
                  result: item.result ?? { disease_name: 'Healthy', confidence: 1, is_healthy: true, recommendation: '' },
                  imageUri: item.imageUri ?? '',
                  sensorData: {
                    temperature: isNaN(parsedTemp) ? undefined : parsedTemp,
                    ph: isNaN(parsedPh) ? undefined : parsedPh,
                    humidity: isNaN(parsedHumidity) ? undefined : parsedHumidity,
                  }
                });
              }
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DiagnosisCard({
  item,
  onPress,
}: {
  item: DiagnosisHistoryItem;
  onPress: () => void;
}) {
  const isSelesai = item.status === 'Selesai';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={isSelesai ? 0.75 : 1}
    >
      {/* Background */}
      <View style={styles.cardBg} />

      {/* Status badge — top right */}
      <View style={[styles.badge, isSelesai ? styles.badgeSelesai : styles.badgeDiproses]}>
        <Text style={[styles.badgeText, isSelesai ? styles.badgeTextSelesai : styles.badgeTextDiproses]}>
          {item.status}
        </Text>
      </View>

      {/* Crop name + date — top left */}
      <View style={styles.cardTopLeft}>
        <Text style={styles.cardCrop}>{item.cropName}</Text>
        <Text style={styles.cardDate}>{item.date}</Text>
        {isSelesai && (
          <Ionicons
            name="chevron-forward-outline"
            size={16}
            color="#0e4719"
            style={styles.cardArrow}
          />
        )}
      </View>

      {/* Bottom section: description + sensors */}
      <View style={styles.cardBottom}>
        <Text style={styles.cardDesc} numberOfLines={5}>
          {item.description}
        </Text>

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
  },
  filterBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#dbe3dd',
    borderColor: '#0e4719',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#000',
  },

  /* ── Scroll ── */
  scroll: {
    flex: 1,
  },
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
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fefdf9',
  },

  /* Status badge */
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
  badgeDiproses: { backgroundColor: '#d9e2f9' },
  badgeSelesai:  { backgroundColor: '#d1f2d7' },
  badgeText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
  },
  badgeTextDiproses: { color: '#2e3d63' },
  badgeTextSelesai:  { color: '#0e4719' },

  /* Crop + date */
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
  cardArrow: {
    marginTop: 2,
  },

  /* Bottom section */
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

  /* Sensor panel */
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
});
