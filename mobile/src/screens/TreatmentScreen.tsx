import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Card from '../components/Card';
import Header from '../components/Header';
import { Theme } from '../theme';
import type { DiagnosisResult } from '../types';

interface TreatmentStep {
  step: number;
  title: string;
  detail: string;
  icon: string;
  timing: string;
  category: 'immediate' | 'chemical' | 'cultural' | 'prevention';
}

const TREATMENTS: Record<string, TreatmentStep[]> = {
  'Bacterial Blight': [
    { step: 1, title: 'Isolasi Tanaman Terinfeksi', detail: 'Segera pisahkan dan tandai tanaman yang menunjukkan gejala agar bakteri tidak menyebar ke tanaman sehat di sekitarnya.', icon: '🚧', timing: 'Segera (hari ini)', category: 'immediate' },
    { step: 2, title: 'Pangkas Bagian Terinfeksi', detail: 'Gunakan gunting bersih yang sudah dicelup alkohol 70%. Potong 5–10 cm di bawah bercak. Bakar atau kubur hasil pangkasan, jangan dijadikan kompos.', icon: '✂️', timing: 'Hari 1–2', category: 'immediate' },
    { step: 3, title: 'Semprot Bakterisida Tembaga', detail: 'Gunakan Copper Hydroxide atau Copper Oxychloride sesuai dosis label. Semprot merata ke seluruh bagian tanaman, utamakan area yang sudah dipotong.', icon: '🧪', timing: 'Hari 2–3', category: 'chemical' },
    { step: 4, title: 'Hindari Penyiraman dari Atas', detail: 'Beralih ke irigasi tetes/drip irrigation. Hindari penyiraman dengan percik karena air yang memercik menyebarkan bakteri ke daun yang sehat.', icon: '💧', timing: 'Mulai sekarang', category: 'cultural' },
    { step: 5, title: 'Sterilkan Alat Pertanian', detail: 'Cuci semua alat dengan air sabun, lalu rendam 10 menit dalam larutan pemutih 10% sebelum digunakan di tanaman berikutnya.', icon: '🔧', timing: 'Setiap kali pakai', category: 'prevention' },
    { step: 6, title: 'Tingkatkan Sirkulasi Udara', detail: 'Pangkas daun lebat yang menghalangi aliran udara. Jarak tanam minimal 40–60 cm membantu mengurangi kelembapan di kanopi.', icon: '🌬️', timing: 'Minggu 1', category: 'cultural' },
  ],
  'Downy Mildew': [
    { step: 1, title: 'Kurangi Kelembapan', detail: 'Pastikan ventilasi baik di sekitar tanaman. Hindari penyiraman malam hari. Buat bedengan yang memungkinkan drainase cepat.', icon: '🌬️', timing: 'Segera', category: 'immediate' },
    { step: 2, title: 'Semprotkan Fungisida Sistemik', detail: 'Gunakan Metalaxyl atau Fosetyl-Al yang efektif terhadap Oomycete. Ikuti rotasi fungisida untuk mencegah resistansi.', icon: '🧴', timing: 'Hari 1', category: 'chemical' },
    { step: 3, title: 'Pangkas Daun Terinfeksi', detail: 'Buang daun bergejala dan musnahkan. Jangan dibiarkan di lahan karena spora dapat bertahan lama.', icon: '✂️', timing: 'Hari 1–2', category: 'immediate' },
    { step: 4, title: 'Aplikasi Fungisida Preventif', detail: 'Semprot Mancozeb atau Chlorothalonil setiap 7–14 hari sebagai lapisan pelindung. Semprot pada pagi hari agar daun kering sebelum malam.', icon: '🛡️', timing: 'Mingguan', category: 'prevention' },
  ],
  'Powdery Mildew': [
    { step: 1, title: 'Semprot Larutan Baking Soda', detail: 'Campurkan 1 sdm baking soda + 1 sdm sabun cuci piring cair + 1 liter air. Semprot ke seluruh permukaan daun. Efektif untuk infeksi awal.', icon: '🧂', timing: 'Segera', category: 'immediate' },
    { step: 2, title: 'Aplikasi Fungisida Sulfur', detail: 'Fungisida berbahan aktif sulfur atau myclobutanil efektif menghambat pertumbuhan spora. Jangan aplikasikan saat suhu >32°C untuk menghindari fitotoksik.', icon: '🧪', timing: 'Hari 1–3', category: 'chemical' },
    { step: 3, title: 'Tingkatkan Sirkulasi Udara', detail: 'Rapikan kanopi tanaman. Kelembapan sedang dengan sirkulasi udara buruk adalah kondisi ideal pertumbuhan embun tepung.', icon: '🌬️', timing: 'Minggu 1', category: 'cultural' },
    { step: 4, title: 'Hindari Pemupukan Nitrogen Berlebih', detail: 'Nitrogen berlebih memacu pertumbuhan daun muda yang rentan terhadap infeksi. Kurangi pupuk N sementara.', icon: '🌿', timing: 'Mulai sekarang', category: 'cultural' },
  ],
  'Early Blight': [
    { step: 1, title: 'Buang Daun Terinfeksi', detail: 'Pangkas semua daun dengan bercak cokelat cincin. Terutama daun tua di bagian bawah yang paling pertama terinfeksi.', icon: '🍂', timing: 'Segera', category: 'immediate' },
    { step: 2, title: 'Semprotkan Fungisida Mankozeb', detail: 'Mankozeb atau Chlorothalonil efektif melindungi daun baru dari infeksi. Semprotkan setiap 7–10 hari.', icon: '🧪', timing: 'Hari 1', category: 'chemical' },
    { step: 3, title: 'Mulching Permukaan Tanah', detail: 'Tutup tanah di sekitar tanaman dengan mulsa jerami/plastik untuk mencegah percikan tanah (sumber spora) ke bagian bawah tanaman.', icon: '🌾', timing: 'Minggu 1', category: 'cultural' },
    { step: 4, title: 'Rotasi Tanaman', detail: 'Jangan menanam tanaman dari keluarga solanaceae di lahan yang sama minimal 2–3 tahun.', icon: '🔄', timing: 'Musim berikutnya', category: 'prevention' },
  ],
  'Late Blight': [
    { step: 1, title: 'DARURAT: Semprot Fungisida Segera', detail: 'Late blight sangat agresif. Segera semprotkan Metalaxyl+Mancozeb atau Cymoxanil+Mancozeb. Jangan tunda lebih dari 24 jam.', icon: '🚨', timing: 'Segera (hari ini)', category: 'immediate' },
    { step: 2, title: 'Buang Tanaman Terparah', detail: 'Tanaman yang sudah >50% terinfeksi sebaiknya dicabut dan dibakar untuk menyelamatkan tanaman di sekitarnya.', icon: '🔥', timing: 'Hari 1', category: 'immediate' },
    { step: 3, title: 'Kurangi Kelembapan', detail: 'Perbaiki drainase dan hindari penyiraman dari atas. Late blight berkembang sangat cepat dalam kondisi lembap.', icon: '💧', timing: 'Segera', category: 'cultural' },
    { step: 4, title: 'Pemantauan Intensif 3 Hari', detail: 'Periksa setiap tanaman setiap hari. Tanda awal (bercak cokelat bertepi putih) harus segera ditangani.', icon: '👁️', timing: 'Setiap hari', category: 'prevention' },
  ],
  'Leaf Spot': [
    { step: 1, title: 'Buang Daun Terinfeksi', detail: 'Singkirkan daun bergejala. Ini mengurangi sumber inokulum secara signifikan.', icon: '🍃', timing: 'Segera', category: 'immediate' },
    { step: 2, title: 'Semprot Fungisida Tembaga', detail: 'Copper Hydroxide atau Copper Fungicide efektif untuk berbagai jenis leaf spot. Semprotkan 2 kali seminggu selama 2–3 minggu.', icon: '🧪', timing: 'Hari 1', category: 'chemical' },
    { step: 3, title: 'Perbaiki Nutrisi Tanaman', detail: 'Tanaman kekurangan Kalium atau Magnesium lebih rentan. Lakukan uji tanah dan perbaiki nutrisi sesuai kebutuhan.', icon: '🌱', timing: 'Minggu 1', category: 'cultural' },
  ],
  'Root Rot': [
    { step: 1, title: 'Perbaiki Drainase Segera', detail: 'Buat alur drainase di sekitar tanaman. Jika dalam pot, ganti media tanam dengan campuran yang lebih poreus (perlite + kompos).', icon: '💧', timing: 'Segera', category: 'immediate' },
    { step: 2, title: 'Kurangi Frekuensi Penyiraman', detail: 'Biarkan lapisan 2–3 cm tanah teratas mengering sebelum menyiram kembali. Overwatering adalah penyebab utama root rot.', icon: '🚿', timing: 'Mulai sekarang', category: 'cultural' },
    { step: 3, title: 'Aplikasi Fungisida Tanah', detail: 'Siramkan Metalaxyl atau Fosetyl-Al ke daerah perakaran. Ini efektif untuk Pythium dan Phytophthora.', icon: '🧴', timing: 'Hari 1', category: 'chemical' },
    { step: 4, title: 'Tambah Agen Hayati', detail: 'Aplikasikan Trichoderma spp. ke tanah. Jamur bermanfaat ini bersifat antagonis terhadap jamur penyebab root rot.', icon: '🦠', timing: 'Minggu 1', category: 'prevention' },
  ],
};

const CATEGORY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  immediate:  { label: 'Tindakan Segera', color: '#991b1b', bg: '#fee2e2' },
  chemical:   { label: 'Kimiawi',         color: '#1e3a8a', bg: '#dbeafe' },
  cultural:   { label: 'Kultural',        color: Theme.colors.grass[700], bg: Theme.colors.grass[100] },
  prevention: { label: 'Pencegahan',      color: '#92400e', bg: '#fef3c7' },
};

export default function TreatmentScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const insets     = useSafeAreaInsets();

  const result: DiagnosisResult = route.params.result;
  const steps: TreatmentStep[] = TREATMENTS[result.disease_name] ?? [];
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (n: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  const progress = steps.length > 0 ? completedSteps.size / steps.length : 0;

  return (
    <View style={styles.flex}>
      <Header title="Langkah Penanggulangan" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Disease header */}
        <Card style={styles.diseaseHeader}>
          <Text style={styles.diseaseTitle}>💊 {result.disease_name}</Text>
          <Text style={styles.diseaseSubtitle}>
            {steps.length} langkah penanggulangan direkomendasikan
          </Text>

          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{completedSteps.size}/{steps.length} selesai</Text>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]} />
          </View>
        </Card>

        {/* Steps */}
        {steps.map((s) => {
          const done = completedSteps.has(s.step);
          const cat  = CATEGORY_LABEL[s.category];
          return (
            <TouchableOpacity
              key={s.step}
              style={[styles.stepCard, done && styles.stepCardDone]}
              onPress={() => toggleStep(s.step)}
              activeOpacity={0.85}
            >
              {/* Step number & checkbox */}
              <View style={[styles.stepNum, done && styles.stepNumDone]}>
                <Text style={[styles.stepNumText, done && styles.stepNumTextDone]}>
                  {done ? '✓' : s.step}
                </Text>
              </View>

              <View style={styles.stepBody}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepIcon}>{s.icon}</Text>
                  <View style={styles.stepMeta}>
                    <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>{s.title}</Text>
                    <View style={styles.stepTagRow}>
                      <View style={[styles.stepTag, { backgroundColor: cat.bg }]}>
                        <Text style={[styles.stepTagText, { color: cat.color }]}>{cat.label}</Text>
                      </View>
                      <View style={styles.timingTag}>
                        <Text style={styles.timingText}>⏰ {s.timing}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Text style={[styles.stepDetail, done && styles.stepDetailDone]}>{s.detail}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {steps.length === 0 && (
          <Card style={styles.noSteps}>
            <Text style={styles.noStepsIcon}>✅</Text>
            <Text style={styles.noStepsText}>Tanaman sehat. Tidak diperlukan tindakan khusus.</Text>
          </Card>
        )}

        {/* Recommendation from AI */}
        <Card style={styles.aiRec}>
          <Text style={styles.aiRecTitle}>💬 Rekomendasi AI</Text>
          <Text style={styles.aiRecText}>{result.recommendation}</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.bgBase },

  diseaseHeader: { margin: Theme.spacing.lg, marginBottom: Theme.spacing.sm },
  diseaseTitle:    { fontSize: Theme.font.sizeLg, fontWeight: Theme.font.weightBold, color: Theme.colors.textPrimary, marginBottom: 4 },
  diseaseSubtitle: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, marginBottom: Theme.spacing.md },
  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted },
  progressPct:   { fontSize: Theme.font.sizeXs, fontWeight: Theme.font.weightSemibold, color: Theme.colors.grass[600] },
  progressBarBg: { height: 8, backgroundColor: Theme.colors.bgMuted, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Theme.colors.grass[600], borderRadius: 4 },

  stepCard: {
    flexDirection: 'row', gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.bgCard,
    marginHorizontal: Theme.spacing.lg, marginBottom: Theme.spacing.sm,
    borderRadius: Theme.radius.lg, padding: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  stepCardDone: { backgroundColor: Theme.colors.grass[50], opacity: 0.75 },

  stepNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Theme.colors.grass[600],
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  stepNumDone:     { backgroundColor: Theme.colors.grass[300] },
  stepNumText:     { color: Theme.colors.white, fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightBold },
  stepNumTextDone: { color: Theme.colors.grass[700] },

  stepBody:  { flex: 1 },
  stepHeader: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  stepIcon:  { fontSize: 22 },
  stepMeta:  { flex: 1 },
  stepTitle: { fontSize: Theme.font.sizeMd, fontWeight: Theme.font.weightSemibold, color: Theme.colors.textPrimary, marginBottom: 4 },
  stepTitleDone: { color: Theme.colors.textMuted, textDecorationLine: 'line-through' },
  stepTagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  stepTag:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Theme.radius.full },
  stepTagText:{ fontSize: Theme.font.sizeXs, fontWeight: Theme.font.weightSemibold },
  timingTag:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Theme.radius.full, backgroundColor: Theme.colors.bgMuted },
  timingText: { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted },
  stepDetail: { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, lineHeight: 20 },
  stepDetailDone: { color: Theme.colors.textMuted, opacity: 0.6 },

  noSteps: { margin: Theme.spacing.lg, alignItems: 'center', paddingVertical: Theme.spacing.xl },
  noStepsIcon: { fontSize: 48, marginBottom: 12 },
  noStepsText: { fontSize: Theme.font.sizeMd, color: Theme.colors.textMuted, textAlign: 'center' },

  aiRec: { marginHorizontal: Theme.spacing.lg, marginTop: Theme.spacing.sm, backgroundColor: Theme.colors.grass[50] },
  aiRecTitle: { fontSize: Theme.font.sizeSm, fontWeight: Theme.font.weightSemibold, color: Theme.colors.grass[700], marginBottom: 8 },
  aiRecText:  { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, lineHeight: 20 },
});
