import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Theme } from '../theme';
import { aiApi } from '../services/api';
import type { CameraMode } from './CameraScreen';

export default function CameraPreviewScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const insets     = useSafeAreaInsets();

  const uri: string           = route.params.uri;
  const mode: CameraMode      = route.params.mode ?? 'diagnosis';
  const cropId: string | undefined = route.params.cropId;

  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      if (mode === 'grading') {
        const id = cropId ?? '00000000-0000-0000-0000-000000000000';
        const result = await aiApi.gradeCrop(id, uri);
        navigation.replace('Diagnosis', { result, mode, imageUri: uri });
      } else {
        const result = await aiApi.diagnose(uri);
        navigation.replace('Diagnosis', { result, mode, imageUri: uri });
      }
    } catch {
      Alert.alert('Gagal', 'Analisis tidak dapat dilakukan. Periksa koneksi internet dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const label = mode === 'grading' ? 'Analisis Kualitas' : 'Analisis Penyakit';

  return (
    <View style={styles.container}>
      {/* Preview image */}
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.topBtnText}>← Ulangi</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Preview Foto</Text>
        <View style={{ width: 72 }} />
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.imageInfo}>
          <Text style={styles.imageInfoIcon}>{mode === 'grading' ? '🥬' : '🔬'}</Text>
          <View>
            <Text style={styles.imageInfoTitle}>
              {mode === 'grading' ? 'Klasifikasi Mutu Sayuran' : 'Deteksi Penyakit Tanaman'}
            </Text>
            <Text style={styles.imageInfoSub}>
              {mode === 'grading'
                ? 'Model CNN akan mengklasifikasikan Grade A/B/C'
                : 'Model AI akan mengidentifikasi jenis penyakit/hama'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
          onPress={handleAnalyze}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Theme.colors.white} size="small" />
              <Text style={styles.analyzeBtnText}>Menganalisis...</Text>
            </View>
          ) : (
            <Text style={styles.analyzeBtnText}>{label}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { ...StyleSheet.absoluteFillObject },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  topBtnText: { color: Theme.colors.white, fontSize: Theme.font.sizeMd, fontWeight: Theme.font.weightMedium },
  topTitle: { color: Theme.colors.white, fontSize: Theme.font.sizeMd, fontWeight: Theme.font.weightSemibold },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Theme.colors.bgCard,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
  },
  imageInfo: { flexDirection: 'row', gap: 12, marginBottom: Theme.spacing.lg, alignItems: 'flex-start' },
  imageInfoIcon:  { fontSize: 40 },
  imageInfoTitle: { fontSize: Theme.font.sizeMd, fontWeight: Theme.font.weightSemibold, color: Theme.colors.textPrimary },
  imageInfoSub:   { fontSize: Theme.font.sizeXs, color: Theme.colors.textMuted, marginTop: 3, lineHeight: 16 },

  analyzeBtn: {
    backgroundColor: Theme.colors.grass[600],
    borderRadius: Theme.radius.md,
    paddingVertical: 16, alignItems: 'center',
    ...Theme.shadow.sm,
  },
  analyzeBtnDisabled: { backgroundColor: Theme.colors.grass[400] },
  analyzeBtnText: { color: Theme.colors.white, fontSize: Theme.font.sizeLg, fontWeight: Theme.font.weightSemibold },
  loadingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
