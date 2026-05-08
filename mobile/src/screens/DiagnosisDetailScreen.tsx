import React from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Header from '../components/Header';
import { Theme } from '../theme';
import type { DiagnosisResult } from '../types';

// Mapping extra info per disease
const DISEASE_INFO: Record<string, {
  description: string;
  symptoms: string[];
  causes: string[];
  spread: string;
  urgency: 'low' | 'medium' | 'high';
}> = {
  'Healthy': {
    description: 'Tanaman dalam kondisi sehat. Tidak ditemukan gejala penyakit.',
    symptoms: [],
    causes: [],
    spread: '—',
    urgency: 'low',
  },
  'Bacterial Blight': {
    description: 'Penyakit bakteri yang menyebabkan bercak cokelat basah pada daun dan busuk batang.',
    symptoms: ['Bercak cokelat bertepi kuning di daun', 'Daun layu mendadak', 'Batang terlihat basah/berlendir'],
    causes: ['Bakteri Xanthomonas spp.', 'Kelembapan tinggi >85%', 'Luka fisik pada tanaman'],
    spread: 'Melalui air hujan, irigasi percik, dan alat pertanian yang tidak steril.',
    urgency: 'high',
  },
  'Downy Mildew': {
    description: 'Jamur palsu yang menyerang permukaan bawah daun, menyebabkan perubahan warna kuning.',
    symptoms: ['Bercak kuning di permukaan atas daun', 'Spora keabu-abuan di bawah daun', 'Daun mengering dan gugur'],
    causes: ['Oomycete Peronospora spp.', 'Suhu 15–20°C', 'Kelembapan sangat tinggi'],
    spread: 'Melalui angin, air, dan biji terinfeksi.',
    urgency: 'medium',
  },
  'Powdery Mildew': {
    description: 'Jamur yang membentuk lapisan serbuk putih di permukaan daun.',
    symptoms: ['Lapisan putih tepung di daun', 'Daun mengeriting dan mengering', 'Pertumbuhan terhambat'],
    causes: ['Jamur Erysiphales', 'Kelembapan sedang (50–70%)', 'Suhu hangat 20–25°C'],
    spread: 'Sangat mudah menyebar melalui angin.',
    urgency: 'medium',
  },
  'Early Blight': {
    description: 'Penyakit umum tomat/kentang yang membentuk bercak cokelat dengan cincin konsentris.',
    symptoms: ['Bercak cokelat gelap berpola cincin di daun tua', 'Daun menguning di sekitar bercak', 'Buah/batang dapat terinfeksi'],
    causes: ['Jamur Alternaria solani', 'Suhu hangat 24–29°C', 'Kelembapan tinggi'],
    spread: 'Melalui spora di udara dan tanah.',
    urgency: 'medium',
  },
  'Late Blight': {
    description: 'Penyakit serius (penyebab kelaparan besar Irlandia) yang dapat menghancurkan panen dalam hitungan hari.',
    symptoms: ['Bercak cokelat gelap di tepi daun', 'Lapisan putih lembap di bawah daun', 'Busuk cepat pada buah/umbi'],
    causes: ['Oomycete Phytophthora infestans', 'Suhu dingin-lembap 10–24°C'],
    spread: 'Sangat cepat melalui angin, air hujan.',
    urgency: 'high',
  },
  'Leaf Spot': {
    description: 'Bercak bulat cokelat/hitam di daun akibat infeksi jamur atau bakteri.',
    symptoms: ['Bercak bulat cokelat/hitam bertepi kuning', 'Daun berlubang saat bercak mengering', 'Defoliasi dini'],
    causes: ['Berbagai jamur/bakteri', 'Kelembapan tinggi', 'Tanaman lemah/kekurangan nutrisi'],
    spread: 'Melalui air irigasi, percik hujan.',
    urgency: 'low',
  },
  'Root Rot': {
    description: 'Pembusukan akar akibat jamur tanah, menyebabkan layu dan kematian tanaman.',
    symptoms: ['Layu meski tanah lembap', 'Akar berwarna cokelat/hitam dan lembek', 'Pertumbuhan sangat terhambat'],
    causes: ['Jamur Fusarium/Pythium/Rhizoctonia', 'Drainase buruk', 'Genangan air'],
    spread: 'Melalui tanah dan air terinfeksi.',
    urgency: 'high',
  },
};

export default function DiagnosisDetailScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const insets     = useSafeAreaInsets();

  const result: DiagnosisResult = route.params.result;
  const imageUri: string        = route.params.imageUri;

  const info = DISEASE_INFO[result.disease_name] ?? DISEASE_INFO['Leaf Spot'];
  const urgencyConfig = {
    low:    { label: 'Rendah',  color: Theme.colors.grass[700],  bg: Theme.colors.grass[50] },
    medium: { label: 'Sedang',  color: '#92400e', bg: '#fef3c7' },
    high:   { label: 'Tinggi',  color: '#991b1b', bg: '#fee2e2' },
  }[info.urgency];

  return (
    <View style={styles.flex}>
      <Header title="Detail Diagnosis" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: imageUri }} style={styles.heroImg} resizeMode="cover" />
          <View style={[styles.heroBadge, { backgroundColor: urgencyConfig.bg }]}>
            <Text style={[styles.heroBadgeText, { color: urgencyConfig.color }]}>
              Urgensi: {urgencyConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Disease name */}
          <View style={styles.titleRow}>
            <Text style={styles.diseaseName}>{result.disease_name}</Text>
            <Badge label={`${(result.confidence * 100).toFixed(1)}%`} variant={result.is_healthy ? 'success' : 'danger'} />
          </View>
          <Text style={styles.diseaseDesc}>{info.description}</Text>

          {/* Symptoms */}
          {info.symptoms.length > 0 && (
            <InfoSection icon="🔍" title="Gejala yang Terdeteksi">
              {info.symptoms.map((s, i) => <BulletItem key={i} text={s} />)}
            </InfoSection>
          )}

          {/* Causes */}
          {info.causes.length > 0 && (
            <InfoSection icon="⚠️" title="Penyebab">
              {info.causes.map((c, i) => <BulletItem key={i} text={c} />)}
            </InfoSection>
          )}

          {/* Spread */}
          {info.spread !== '—' && (
            <InfoSection icon="📡" title="Cara Penyebaran">
              <Text style={styles.spreadText}>{info.spread}</Text>
            </InfoSection>
          )}

          {/* CTA */}
          {!result.is_healthy && (
            <TouchableOpacity
              style={styles.treatmentBtn}
              onPress={() => navigation.navigate('Treatment', { result })}
              activeOpacity={0.85}
            >
              <Text style={styles.treatmentBtnIcon}>💊</Text>
              <Text style={styles.treatmentBtnText}>Lihat Langkah Penanggulangan</Text>
              <Text style={styles.treatmentBtnArrow}>→</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.bgBase },

  hero: { position: 'relative' },
  heroImg: { width: '100%', height: 200 },
  heroBadge: {
    position: 'absolute', bottom: 12, right: 12,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Theme.radius.full,
  },
  heroBadgeText: { fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightSemibold },

  body: { padding: Theme.spacing.lg, gap: Theme.spacing.md },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  diseaseName: { fontSize: Theme.font.sizeXl, fontWeight: Theme.font.weightBold, color: Theme.colors.textPrimary, flex: 1, marginRight: 8 },
  diseaseDesc: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, lineHeight: 20 },

  section: {},
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon:   { fontSize: 20 },
  sectionTitle:  { fontSize: Theme.font.sizeMd, fontWeight: Theme.font.weightSemibold, color: Theme.colors.textPrimary },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.colors.grass[600], marginTop: 6 },
  bulletText: { flex: 1, fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, lineHeight: 20 },
  spreadText: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, lineHeight: 20 },

  treatmentBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Theme.colors.grass[600],
    borderRadius: Theme.radius.md,
    paddingVertical: 16, paddingHorizontal: Theme.spacing.lg,
    gap: 10,
    ...Theme.shadow.sm,
  },
  treatmentBtnIcon:  { fontSize: 24 },
  treatmentBtnText:  { flex: 1, color: Theme.colors.white, fontSize: Theme.font.sizeMd, fontWeight: Theme.font.weightSemibold },
  treatmentBtnArrow: { color: Theme.colors.white, fontSize: 20, fontWeight: Theme.font.weightBold },
});
