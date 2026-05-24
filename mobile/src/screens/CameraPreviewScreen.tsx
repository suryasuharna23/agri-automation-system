import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { aiApi, sensorApi } from '../services/api';
import type { CameraMode } from './CameraScreen';

type SensorContext = {
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  ph: number | null;
};

const debugLog = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

const debugWarn = (...args: unknown[]) => {
  if (__DEV__) console.warn(...args);
};

const debugError = (...args: unknown[]) => {
  if (__DEV__) console.error(...args);
};
function getAnalysisErrorMessage(err: any) {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;

  if (status === 400) {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg ?? 'Gambar tidak valid.';
    }
    return 'Gambar tidak valid. Ambil ulang foto dengan pencahayaan yang lebih jelas.';
  }
  if (status === 401 || status === 403) return 'Sesi login berakhir. Silakan login ulang.';
  if (status === 503) {
    if (typeof detail === 'string') return detail;
    return 'Layanan AI sedang tidak tersedia. Coba beberapa saat lagi.';
  }
  if (err?.request && !err?.response) return 'Tidak dapat terhubung ke server. Periksa koneksi dan alamat API.';
  return 'Analisis tidak dapat dilakukan. Coba lagi beberapa saat lagi.';
}

export default function CameraPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const mode: CameraMode = route.params?.mode ?? 'diagnosis';
  const cropId: string | undefined = route.params?.cropId;

  debugLog("🔧 [CameraPreview] ====== SCREEN MOUNTED ======");
  debugLog("🔧 [CameraPreview] Mode:", mode);
  debugLog("🔧 [CameraPreview] CropId:", cropId);
  // ───────────────────────────────────────────────────

  // Support single uri or batch uris array
  const initialPhotos: string[] = route.params?.uris ?? (route.params?.uri ? [route.params.uri] : []);

  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const current = photos[index];
  const total = photos.length;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(total - 1, i + 1));

  const deletePhoto = () => {
    if (total === 1) {
      navigation.goBack();
      return;
    }
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    setIndex(Math.min(index, next.length - 1));
  };

  const [sensorData, setSensorData] = useState<SensorContext | null>(null);

  // ── Fetch live sensor data on mount ────────────────
  useEffect(() => {
    debugLog("🔧 [CameraPreview] useEffect: fetching sensor data...");
    let active = true;
    const fetchSensorData = async () => {
      try {
        debugLog("🔧 [CameraPreview] Calling sensorApi.listNodes()...");
        const nodes = await sensorApi.listNodes();
        debugLog("🔧 [CameraPreview] listNodes returned:", nodes?.length, "nodes");
        debugLog("[CameraPreview] Sensor nodes fetched", nodes?.length ?? 0);
        if (nodes && nodes.length > 0) {
          debugLog("🔧 [CameraPreview] Calling getReadings for node:", nodes[0].id);
          const readings = await sensorApi.getReadings(nodes[0].id, 1);
          debugLog("🔧 [CameraPreview] getReadings returned:", readings?.length, "readings");
          if (active && readings && readings.length > 0) {
            const latest = readings[0];
            setSensorData({
              temperature: latest.temperature,
              humidity: latest.humidity,
              soil_moisture: latest.soil_moisture,
              ph: latest.ph,
            });
          } else {
            debugLog("🔧 [CameraPreview] No readings found; sensor context unavailable");
          }
        } else {
          debugLog("🔧 [CameraPreview] No sensor nodes found; sensor context unavailable");
        }
      } catch (err) {
        debugWarn("🔧 [CameraPreview] ⚠️ Failed to fetch live sensor data:", err);
        debugWarn("🔧 [CameraPreview] ⚠️ Error type:", typeof err);
        debugWarn("🔧 [CameraPreview] ⚠️ Error string:", String(err));
      }
    };
    fetchSensorData();
    return () => {
      debugLog("🔧 [CameraPreview] useEffect cleanup");
      active = false;
    };
  }, []);
  // ───────────────────────────────────────────────────

  const handleAnalyze = async () => {
    debugLog("🔧 [CameraPreview] ====== ANALYZE BUTTON PRESSED ======");
    debugLog("🔧 [CameraPreview] Mode:", mode);
    debugLog("🔧 [CameraPreview] Sensor data available:", !!sensorData);
    debugLog("🔧 [CameraPreview] CropId:", cropId);

    setLoading(true);
    try {
      if (mode === 'grading') {
        const id = cropId ?? '00000000-0000-0000-0000-000000000000';
        debugLog("🔧 [CameraPreview] GRADE mode — calling aiApi.gradeCrop with id:", id);
        debugLog("[CameraPreview] About to POST to /ai/grade/{cropId}");

        const result = await aiApi.gradeCrop(id, current);

        debugLog("[CameraPreview] GRADE result", { grade: result.grade, confidence: result.confidence, mode: result.mode ?? "model" });

        // Fetch LLM insight for grading (non-blocking enhancement)
        let insight = '';
        try {
          debugLog("🔧 [CameraPreview] Fetching grading insight...");
          insight = await aiApi.getGradingInsight(
            result.grade,
            result.confidence,
            result.grade_a_prob,
            result.grade_b_prob,
            result.grade_c_prob,
            sensorData ?? undefined,
          );
          debugLog("🔧 [CameraPreview] Grading insight received, length:", insight?.length);
        } catch (err) {
          debugWarn("🔧 [CameraPreview] Grading insight fetch failed:", err);
        }

        debugLog("🔧 [CameraPreview] Navigating to DiagnosisDetail with grade result");
        navigation.navigate('Main', { screen: 'Diagnosis', params: { screen: 'DiagnosisDetail', params: { result, mode, imageUri: current, insight, sensorData: sensorData ?? undefined } } });
      } else {
        debugLog("[CameraPreview] DIAGNOSE mode calling aiApi.diagnose");
        debugLog("[CameraPreview] About to POST to /ai/diagnose");

        const result = await aiApi.diagnose(current);

        debugLog("[CameraPreview] DIAGNOSE result", { disease_name: result.disease_name, confidence: result.confidence, is_healthy: result.is_healthy, mode: result.mode ?? "model" });
        debugLog("🔧 [CameraPreview]   disease_name:", result.disease_name);
        debugLog("🔧 [CameraPreview]   confidence:", result.confidence);
        debugLog("🔧 [CameraPreview]   is_healthy:", result.is_healthy);

        // Fetch LLM insight for disease (non-blocking enhancement)
        let insight = '';
        try {
          debugLog("🔧 [CameraPreview] Fetching disease insight...");
          insight = await aiApi.getDiseaseInsight(
            result.disease_name,
            result.confidence,
            result.is_healthy,
            sensorData ?? undefined,
          );
          debugLog("🔧 [CameraPreview] Disease insight received, length:", insight?.length);
          // Save insight to backend so it appears in history
          if (result.record_id && insight) {
            aiApi.saveDiagnosisInsight(result.record_id, insight).catch((err) => {
              debugWarn("🔧 [CameraPreview] Failed to save insight:", err);
            });
          }
        } catch (err) {
          debugWarn("🔧 [CameraPreview] Disease insight fetch failed:", err);
        }

        debugLog("🔧 [CameraPreview] Navigating to DiagnosisDetail with diagnosis result");
        navigation.navigate('Main', { screen: 'Diagnosis', params: { screen: 'DiagnosisDetail', params: { result, mode, imageUri: current, insight, sensorData: sensorData ?? undefined } } });
      }
    } catch (err: any) {
      // ── DEBUG: Log every detail of the error ──
      debugError("🔧 [CameraPreview] ❌❌❌ ANALYZE FAILED ❌❌❌");
      debugError("🔧 [CameraPreview] Error type:", typeof err);
      debugError("🔧 [CameraPreview] Error constructor:", err?.constructor?.name);
      debugError("🔧 [CameraPreview] Error message:", err?.message);
      debugError("🔧 [CameraPreview] Error code:", err?.code);
      debugError("🔧 [CameraPreview] Error stack:", err?.stack);

      // AxiosError specific fields
      if (err?.response) {
        debugError("🔧 [CameraPreview] Axios response status:", err.response.status);
        debugError("[CameraPreview] Axios response detail:", err.response.data?.detail ?? err.response.status);
      }
      if (err?.config) {
        debugError("[CameraPreview] Request path:", err.config?.url);
        debugError("🔧 [CameraPreview] Request method:", err.config?.method);
      }
      if (err?.request) {
        debugError("🔧 [CameraPreview] Request object present (network error type):", typeof err.request);
      }
      // ───────────────────────────────────────────

      Alert.alert('Gagal', getAnalysisErrorMessage(err));
    } finally {
      debugLog("🔧 [CameraPreview] ====== ANALYZE COMPLETE ======");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <Ionicons name="arrow-back" size={24} color="#fbf2d4" />
        </TouchableOpacity>

        {total > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{index + 1}/{total}</Text>
          </View>
        )}

        <View style={styles.topRight}>
          <View style={styles.galleryIconBox}>
            <Ionicons name="images-outline" size={20} color="#fbf2d4" />
          </View>
          <TouchableOpacity
            style={styles.addIconBox}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Ionicons name="add-outline" size={24} color="#0e4719" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Image preview card ── */}
      <View style={styles.imageArea}>
        {current ? (
          <Image source={{ uri: current }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}

        {/* Left / right nav arrows */}
        {total > 1 && (
          <View style={styles.navRow} pointerEvents="box-none">
            <TouchableOpacity
              style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}
              onPress={prev}
              disabled={index === 0}
            >
              <Ionicons name="chevron-back" size={24} color="#062f0e" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, index === total - 1 && styles.navBtnDisabled]}
              onPress={next}
              disabled={index === total - 1}
            >
              <Ionicons name="chevron-forward" size={24} color="#062f0e" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Bottom action bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {/* Delete / discard */}
        <TouchableOpacity style={styles.actionBtn} onPress={deletePhoto} disabled={loading}>
          <Ionicons name="trash-outline" size={36} color="#fbf2d4" />
        </TouchableOpacity>

        {/* Retake — back to camera */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="camera-outline" size={36} color="#fbf2d4" />
        </TouchableOpacity>

        {/* Analyze */}
        <TouchableOpacity
          style={[styles.actionBtn, loading && styles.actionBtnLoading]}
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fbf2d4" size="small" />
          ) : (
            <Ionicons name="checkmark-outline" size={36} color="#fbf2d4" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefbf2',
  },

  /* ── Top bar ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 43,
    height: 43,
    borderRadius: 8,
    backgroundColor: '#0e4719',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0e4719',
  },
  counterText: {
    fontSize: 16,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#fbf2d4',
    textAlign: 'center',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 46,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: '#fefbf2',
  },
  galleryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0e4719',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  addIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Image area ── */
  imageArea: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#d9d9d9',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#d9d9d9',
  },
  navRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  navBtn: {
    width: 43,
    height: 43,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#062f0e',
    backgroundColor: '#fbf2d4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#0e4719',
    backgroundColor: '#fefbf2',
  },
  actionBtn: {
    width: 70,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0e4719',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnLoading: {
    backgroundColor: '#44694b',
  },
});
