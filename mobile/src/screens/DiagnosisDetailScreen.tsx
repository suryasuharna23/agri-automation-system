import React, { useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { DiagnosisResult, GradingResult } from '../types';

const DISEASE_INFO: Record<string, {
  tempNote: string;
  humidNote: string;
  pestNote: string;
  healthNote: string;
  actionCategories: ('suhu' | 'kelembapan' | 'hama')[];
  steps: Record<'suhu' | 'kelembapan' | 'hama', string[]>;
}> = {
  Healthy: {
    tempNote: 'Suhu lingkungan dalam rentang optimal. Tidak ada dampak negatif terhadap tanaman.',
    humidNote: 'Kelembapan udara dan tanah dalam batas normal. Pertahankan kondisi ini.',
    pestNote: 'Tidak ditemukan tanda-tanda serangan hama maupun penyakit.',
    healthNote: 'Tanaman sehat dan tumbuh optimal. Lanjutkan perawatan rutin.',
    actionCategories: [],
    steps: { suhu: [], kelembapan: [], hama: [] },
  },
  'Bacterial Spot': {
    tempNote: 'Suhu hangat di atas 25°C mempercepat reproduksi bakteri Xanthomonas. Jaga suhu di bawah 28°C dan hindari perubahan mendadak.',
    humidNote: 'Kelembapan di atas 85% menjadi faktor utama perkembangan penyakit ini. Kurangi frekuensi penyiraman dan perbaiki drainase.',
    pestNote: 'Disebabkan oleh bakteri Xanthomonas spp. Penyebaran melalui air irigasi, percik hujan, dan alat pertanian tidak steril.',
    healthNote: 'Urgensi tinggi. Segera pisahkan tanaman terinfeksi dan semprotkan bakterisida berbasis tembaga.',
    actionCategories: ['suhu', 'kelembapan', 'hama'],
    steps: {
      suhu: [
        'Pasang ventilasi tambahan atau net shade 40–50% untuk meredam panas siang hari.',
        'Hindari penyiraman saat suhu puncak (pukul 10.00–14.00).',
        'Monitor suhu minimal dua kali sehari dan catat tren kenaikan.',
      ],
      kelembapan: [
        'Pemberian Kapur Pertanian (Dolomit) untuk menetralkan keasaman tanah yang memperburuk kondisi.',
        'Evaluasi jadwal irigasi — kurangi frekuensi jika tanah sudah cukup lembap.',
        'Cek drainase bedengan; pastikan air tidak menggenang lebih dari 30 menit.',
        'Pastikan sirkulasi udara antar tanaman cukup dengan mengatur jarak tanam.',
      ],
      hama: [
        'Semprotkan bakterisida berbasis tembaga (copper hydroxide) setiap 7 hari.',
        'Sterilkan alat pertanian sebelum dan sesudah digunakan di lahan.',
        'Pisahkan dan musnahkan bagian tanaman yang terinfeksi parah.',
        'Hindari menggunakan air irigasi dari sumber yang sama dengan lahan terinfeksi.',
      ],
    },
  },
  'Downy Mildew': {
    tempNote: 'Suhu optimal perkembangan jamur ini 15–20°C. Meningkatkan suhu lingkungan sedikit dapat menghambat perkembangan spora.',
    humidNote: 'Kelembapan sangat tinggi menjadi syarat utama sporulasi. Tingkatkan sirkulasi udara dan hindari penyiraman malam hari.',
    pestNote: 'Disebabkan oomycete Peronospora spp. Spora menyebar melalui angin dan air. Semprotkan fungisida sistemik.',
    healthNote: 'Urgensi sedang. Buang daun terinfeksi dan aplikasikan fungisida. Pantau perkembangan 3–5 hari ke depan.',
    actionCategories: ['kelembapan', 'hama'],
    steps: {
      suhu: [],
      kelembapan: [
        'Hindari penyiraman di atas pukul 16.00 agar daun dapat mengering sebelum malam.',
        'Atur jarak tanam agar ada aliran udara yang baik antar tanaman.',
        'Cek drainase dan pastikan tidak ada genangan di sekitar bedengan.',
      ],
      hama: [
        'Semprotkan fungisida sistemik berbasis metalaxyl atau mancozeb.',
        'Buang dan musnahkan daun yang menunjukkan gejala bercak kuning kecoklatan.',
        'Ulangi aplikasi fungisida setiap 7–10 hari hingga gejala mereda.',
        'Pantau lahan setiap hari selama 5 hari ke depan.',
      ],
    },
  },
  'Powdery Mildew': {
    tempNote: 'Suhu 20–25°C dengan kondisi kering di siang hari dan lembap di malam hari ideal bagi jamur ini. Pertahankan ventilasi yang baik.',
    humidNote: 'Paradoksnya, kelembapan sedang (50–70%) justru mendukung perkembangan jamur ini, bukan kelembapan tinggi.',
    pestNote: 'Disebabkan jamur Erysiphales. Sangat mudah menyebar melalui angin. Gunakan fungisida sulfur atau kalium bikarbonat.',
    healthNote: 'Urgensi sedang. Potong bagian yang terinfeksi parah dan aplikasikan fungisida. Hindari pemupukan nitrogen berlebihan.',
    actionCategories: ['hama'],
    steps: {
      suhu: [],
      kelembapan: [],
      hama: [
        'Semprotkan larutan kalium bikarbonat (1 sdt per liter air) ke seluruh permukaan daun.',
        'Potong dan musnahkan bagian tanaman yang tertutup serbuk putih.',
        'Hindari pemupukan nitrogen berlebihan yang mendorong pertumbuhan jaringan lunak.',
        'Ulangi aplikasi setiap 5–7 hari selama 3 siklus.',
      ],
    },
  },
  'Early Blight': {
    tempNote: 'Suhu 24–29°C mempercepat perkembangan jamur Alternaria solani. Fluktuasi suhu memperbesar risiko infeksi.',
    humidNote: 'Kelembapan tinggi terutama pada malam hari mendorong sporulasi. Penyiraman pagi hari membantu daun mengering sebelum malam.',
    pestNote: 'Disebabkan jamur Alternaria solani. Spora terbawa angin dan tanah terinfeksi. Gunakan fungisida berbasis mancozeb atau klorotalonil.',
    healthNote: 'Urgensi sedang. Angkat daun terinfeksi, aplikasikan fungisida, dan rotasi tanaman musim berikutnya.',
    actionCategories: ['suhu', 'hama'],
    steps: {
      suhu: [
        'Pasang mulsa di sekitar tanaman untuk menstabilkan suhu tanah.',
        'Tambahkan naungan ringan (30%) saat cuaca terik untuk mengurangi stres suhu.',
        'Siram di pagi hari untuk menjaga suhu tanah lebih stabil sepanjang hari.',
      ],
      kelembapan: [],
      hama: [
        'Angkat dan musnahkan daun yang menunjukkan bercak cokelat berpola cincin konsentris.',
        'Semprotkan fungisida berbasis mancozeb atau klorotalonil setiap 7 hari.',
        'Pastikan tidak ada sisa tanaman terinfeksi di sekitar bedengan.',
        'Rencanakan rotasi tanaman untuk musim tanam berikutnya.',
      ],
    },
  },
  'Late Blight': {
    tempNote: 'Suhu 10–24°C dengan kondisi lembap sangat mendukung Phytophthora infestans. Suhu di atas 30°C menghambat perkembangannya.',
    humidNote: 'Diperlukan kondisi sangat lembap untuk perkecambahan spora. Sistem drainase yang baik sangat krusial untuk mencegah penyakit ini.',
    pestNote: 'Disebabkan Phytophthora infestans. Penyebaran sangat cepat melalui angin dan air. Gunakan fungisida sistemik segera.',
    healthNote: 'URGENSI TINGGI. Tanaman terinfeksi harus dipisahkan secepatnya. Semprotkan fungisida sistemik dan hubungi ahli pertanian.',
    actionCategories: ['suhu', 'kelembapan', 'hama'],
    steps: {
      suhu: [
        'Pantau suhu setiap 2 jam; catat jika turun di bawah 20°C karena ini zona berbahaya.',
        'Gunakan terowongan plastik (row cover) untuk menaikkan suhu mikro lahan jika diperlukan.',
        'Hindari irigasi malam hari yang dapat menurunkan suhu tanah.',
      ],
      kelembapan: [
        'Perbaiki sistem drainase secara mendesak — buat saluran pembuangan air di sisi bedengan.',
        'Hentikan penyiraman selama 3–5 hari dan biarkan tanah mengering sebagian.',
        'Kurangi kerapatan tanaman untuk meningkatkan sirkulasi udara.',
        'Tutup tanah dengan mulsa plastik hitam untuk mencegah percikan tanah ke daun.',
      ],
      hama: [
        'Semprotkan fungisida sistemik (metalaxyl + mancozeb) SEGERA, selambatnya 24 jam.',
        'Pisahkan tanaman yang menunjukkan gejala dari tanaman sehat.',
        'Musnahkan seluruh bagian tanaman terinfeksi — jangan dikompos.',
        'Hubungi penyuluh pertanian setempat untuk asistensi teknis lebih lanjut.',
        'Ulangi aplikasi fungisida setiap 5 hari selama minimum 3 kali.',
      ],
    },
  },
  'Leaf Spot': {
    tempNote: 'Kondisi suhu saat ini tidak menjadi faktor risiko utama. Tetap pantau jika terjadi perubahan cuaca ekstrem.',
    humidNote: 'Kelembapan tinggi mempercepat penyebaran. Hindari percikan air ke daun saat penyiraman.',
    pestNote: 'Infeksi jamur/bakteri oportunistik. Aplikasikan fungisida/bakterisida spektrum luas. Buang daun terinfeksi.',
    healthNote: 'Urgensi rendah. Tanaman masih dapat pulih dengan perawatan tepat. Pantau perkembangan bercak selama seminggu.',
    actionCategories: ['kelembapan'],
    steps: {
      suhu: [],
      kelembapan: [
        'Siram tanaman di pangkal, bukan di atas daun, untuk mengurangi kelembapan daun.',
        'Buat jarak antar tanaman lebih lebar agar udara dapat mengalir bebas.',
        'Hindari penyiraman setelah pukul 15.00.',
      ],
      hama: [],
    },
  },
  'Root Rot': {
    tempNote: 'Suhu tanah yang tinggi dikombinasikan dengan kelembapan berlebih menciptakan kondisi ideal bagi jamur akar.',
    humidNote: 'Drainase buruk dan genangan air adalah penyebab utama. Perbaiki drainase media tanam segera.',
    pestNote: 'Disebabkan Fusarium/Pythium/Rhizoctonia. Sulit diobati, lebih mudah dicegah. Gunakan fungisida drench ke tanah.',
    healthNote: 'Urgensi tinggi. Cabut tanaman terinfeksi parah. Sterilkan media tanam sebelum menanam kembali.',
    actionCategories: ['kelembapan', 'hama'],
    steps: {
      suhu: [],
      kelembapan: [
        'Hentikan penyiraman segera dan biarkan media tanam mengering hingga 50% kapasitas lapang.',
        'Perbaiki atau buat ulang sistem drainase bedengan.',
        'Ganti media tanam yang tergenang dengan campuran tanah + sekam bakar (1:1).',
        'Pastikan pot/bedengan memiliki lubang drainase yang tidak tersumbat.',
      ],
      hama: [
        'Siramkan fungisida drench (metalaxyl atau fosetyl-Al) langsung ke zona akar.',
        'Cabut dan musnahkan tanaman yang akarnya sudah membusuk lebih dari 60%.',
        'Sterilkan media tanam bekas dengan solarisasi (tutup plastik transparan 2 minggu).',
        'Jangan menanam kembali di tempat yang sama sebelum masa pemulihan tanah selesai.',
      ],
    },
  },
};

interface Category {
  key: 'suhu' | 'kelembapan' | 'hama' | 'kesehatan';
  title: string;
  description: string;
  needsAction: boolean;
  steps: string[];
}

function getDiseaseInfo(diseaseName: string) {
  if (DISEASE_INFO[diseaseName]) return DISEASE_INFO[diseaseName];
  // Strip plant suffix like "(Tomat)", "(Pepper/Cabai)" and try again
  const baseName = diseaseName.replace(/\s*\([^)]+\)\s*$/, '').trim();
  return DISEASE_INFO[baseName] ?? DISEASE_INFO['Leaf Spot'];
}

function buildGradingCategories(result: GradingResult): Category[] {
  const gradeInfo: Record<string, { desc: string; needsAction: boolean; steps: string[] }> = {
    A: {
      desc: 'Kualitas premium. Produk layak dijual dengan harga tertinggi di pasar.',
      needsAction: false,
      steps: [],
    },
    B: {
      desc: 'Kualitas standar. Produk layak jual dengan harga pasar normal.',
      needsAction: false,
      steps: [],
    },
    C: {
      desc: 'Kualitas di bawah standar. Perlu evaluasi kondisi budidaya dan penanganan pasca-panen.',
      needsAction: true,
      steps: [
        'Evaluasi kondisi lahan: periksa kecukupan air dan nutrisi tanaman.',
        'Perhatikan waktu panen yang tepat — jangan terlambat atau terlalu dini.',
        'Perbaiki penanganan pasca-panen: sortasi dan pengemasan yang hati-hati.',
        'Konsultasikan dengan penyuluh pertanian untuk rekomendasi lebih lanjut.',
      ],
    },
  };

  const grade = (result.grade ?? 'ungraded').toUpperCase();
  const info = gradeInfo[grade] ?? { desc: 'Grade tidak dikenali. Coba ulangi analisis.', needsAction: false, steps: [] };

  return [
    {
      key: 'kesehatan',
      title: `Hasil Grade: ${grade}`,
      description: `${(result.confidence * 100).toFixed(1)}% keyakinan — ${info.desc}`,
      needsAction: info.needsAction,
      steps: info.steps,
    },
    {
      key: 'suhu',
      title: 'Distribusi Grade',
      description: `Grade A: ${(result.grade_a_prob * 100).toFixed(1)}%  •  Grade B: ${(result.grade_b_prob * 100).toFixed(1)}%  •  Grade C: ${(result.grade_c_prob * 100).toFixed(1)}%`,
      needsAction: false,
      steps: [],
    },
  ];
}

function buildCategories(result: DiagnosisResult): Category[] {
  const info = getDiseaseInfo(result.disease_name);
  const sick = !result.is_healthy;
  return [
    {
      key: 'suhu',
      title: 'Suhu',
      description: info.tempNote,
      needsAction: sick && info.actionCategories.includes('suhu'),
      steps: info.steps.suhu,
    },
    {
      key: 'kelembapan',
      title: 'Kelembapan',
      description: info.humidNote,
      needsAction: sick && info.actionCategories.includes('kelembapan'),
      steps: info.steps.kelembapan,
    },
    {
      key: 'hama',
      title: 'Hama',
      description: info.pestNote,
      needsAction: sick && info.actionCategories.includes('hama'),
      steps: info.steps.hama,
    },
    {
      key: 'kesehatan',
      title: 'Kesehatan',
      description: `${(result.confidence * 100).toFixed(1)}% keyakinan — ${info.healthNote}`,
      needsAction: false,
      steps: [],
    },
  ];
}

export default function DiagnosisDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  // ── DEBUG ──────────────────────────────────────────
  console.log("🔧 [DiagnosisDetail] ====== MOUNTED =====");
  console.log("🔧 [DiagnosisDetail] Route params:", JSON.stringify(route.params, null, 2));
  // ───────────────────────────────────────────────────

  const result = route.params?.result;
  const mode: 'grading' | 'diagnosis' = route.params?.mode ?? 'diagnosis';
  const imageUri: string = route.params?.imageUri ?? '';
  const llmInsight: string = route.params?.insight ?? '';
  const sensorData = route.params?.sensorData;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!result) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fbf2d4" />
        </TouchableOpacity>
      </View>
    );
  }

  const categories = mode === 'grading'
    ? buildGradingCategories(result as GradingResult)
    : buildCategories(result as DiagnosisResult);
  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* ── Header ── */}
        <View style={[styles.headerArea, { paddingTop: insets.top + 8 }]}>
          <View style={styles.titleRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fbf2d4" />
            </TouchableOpacity>
            <Text style={styles.title}>Detail Diagnosis</Text>
          </View>

          {/* Sensor readings box */}
          <View style={styles.sensorBox}>
            <Ionicons name="leaf-outline" size={24} color="#0e4719" style={styles.decoLeafLeft} />

            <View style={styles.sensorRow}>
              <View style={styles.sensorCard}>
                <Ionicons name="leaf" size={37} color="#0e4719" />
                <Text style={styles.sensorVal}>
                  {(result.confidence * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.sensorCard}>
                <Image
                  style={styles.icontemp}
                  resizeMode="cover"
                  source={require('../../assets/icons/icon-temp.png')}
                />
                <Text style={styles.sensorVal}>
                  {sensorData?.temperature !== undefined ? `${sensorData.temperature.toFixed(0)}°` : '27°'}
                </Text>
              </View>
              <View style={styles.sensorCard}>
                <Image
                  style={styles.iconph}
                  resizeMode="cover"
                  source={require('../../assets/icons/icon-ph.png')}
                />
                <Text style={styles.sensorVal}>
                  {sensorData?.ph !== undefined ? sensorData.ph.toFixed(1) : '6.2'}
                </Text>
              </View>
            </View>

            <View style={styles.dotRow}>
              <View style={[styles.dot, styles.dotLight]} />
              <View style={[styles.dot, styles.dotDark]} />
            </View>

            <Ionicons name="leaf-outline" size={24} color="#0e4719" style={styles.decoLeafRight} />
          </View>
        </View>

        {/* ── Category cards ── */}
        <View style={styles.cardList}>
          {categories.map((cat) => {
            const isExpanded = !!expanded[cat.key];
            return (
              <View key={cat.key} style={styles.cardGroup}>
                {/* Main card */}
                <View style={styles.card}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
                  )}
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{cat.title}</Text>
                    <Text style={styles.cardDesc} numberOfLines={4}>{cat.description}</Text>
                  </View>
                </View>

                {/* Expandable action bar — only if needsAction */}
                {cat.needsAction && (
                  <View style={styles.actionGroup}>
                    <TouchableOpacity
                      style={styles.actionBar}
                      onPress={() => toggle(cat.key)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.actionLeft}>
                        <Ionicons name="alert-circle-outline" size={20} color="#923333" />
                        <Text style={styles.actionLabel}>PERLU TINDAKAN</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.actionRight}
                        onPress={() => navigation.navigate('Treatment', { result, imageUri, sensorData })}
                      >
                        <Text style={styles.actionLink}>Lihat Penanggulangan</Text>
                        <Ionicons
                          name="chevron-forward-outline"
                          size={16}
                          color="#923333"
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {isExpanded && cat.steps.length > 0 && (
                      <View style={styles.stepsList}>
                        {cat.steps.map((step, i) => (
                          <View key={i} style={styles.stepRow}>
                            <View style={styles.stepNumber}>
                              <Text style={styles.stepNumberText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* ── LLM AI Insight card ── */}
          {llmInsight.length > 0 && (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="sparkles-outline" size={18} color="#0e4719" />
                <Text style={styles.insightTitle}>AI Insight</Text>
              </View>
              <Text style={styles.insightText}>{llmInsight}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffefb',
    overflow: 'hidden',
  },

  /* ── Header ── */
  headerArea: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  backBtn: {
    width: 43,
    height: 43,
    borderRadius: 8,
    backgroundColor: '#0e4719',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },

  /* Sensor box */
  sensorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0e4719',
    backgroundColor: '#fefdf9',
    paddingVertical: 14,
    paddingHorizontal: 12,
    position: 'relative',
  },
  decoLeafLeft: {
    position: 'absolute',
    top: -12,
    left: 20,
    opacity: 0.6,
  },
  decoLeafRight: {
    position: 'absolute',
    top: -12,
    right: 20,
    opacity: 0.6,
    transform: [{ scaleX: -1 }],
  },
  sensorRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  sensorCard: {
    width: 104,
    height: 94,
    borderRadius: 12,
    backgroundColor: '#d3e6d7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 26,
  },
  icontemp: {
    width: 13,
    height: 32,
  },
  iconph: {
    width: 32,
    height: 32,
  },
  sensorVal: {
    fontSize: 20,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    alignSelf: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  dotLight: {
    backgroundColor: '#e7ede8',
  },
  dotDark: {
    backgroundColor: '#b4c0b6',
  },

  /* ── Card list ── */
  cardList: {
    paddingHorizontal: 14,
    gap: 14,
    paddingBottom: 8,
  },
  cardGroup: {
    gap: 0,
  },

  /* Individual card */
  card: {
    height: 112,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0e4719',
    backgroundColor: '#fefbf2',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardImage: {
    width: 108,
    height: 110,
    borderRadius: 12,
  },
  cardImagePlaceholder: {
    backgroundColor: '#d3e6d7',
  },
  cardText: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    lineHeight: 16,
  },

  /* Action group */
  actionGroup: {
    marginHorizontal: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#f4c3c3',
    overflow: 'hidden',
  },
  actionBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#923333',
  },
  actionLink: {
    fontSize: 10,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#923333',
  },

  /* Treatment steps */
  stepsList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#923333',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#5a1e1e',
    lineHeight: 17,
  },

  /* AI Insight card */
  insightCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0e4719',
    backgroundColor: '#f0f7f1',
    padding: 14,
    gap: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
  },
  insightText: {
    fontSize: 13,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#1a3d1f',
    lineHeight: 19,
  },
});
