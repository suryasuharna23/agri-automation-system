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

export default function CameraPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const mode: CameraMode = route.params?.mode ?? 'diagnosis';
  const cropId: string | undefined = route.params?.cropId;

  // ── DEBUG: Log all route params ────────────────────
  console.log("🔧 [CameraPreview] ====== SCREEN MOUNTED ======");
  console.log("🔧 [CameraPreview] Route params:", JSON.stringify(route.params, null, 2));
  console.log("🔧 [CameraPreview] Mode:", mode);
  console.log("🔧 [CameraPreview] CropId:", cropId);
  // ───────────────────────────────────────────────────

  // Support single uri or batch uris array
  const initialPhotos: string[] = route.params?.uris ?? (route.params?.uri ? [route.params.uri] : []);
  console.log("🔧 [CameraPreview] initialPhotos:", initialPhotos.length, "URIs:", initialPhotos);

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

  // State to hold dynamically loaded sensor data, defaulted to safe values
  const [sensorData, setSensorData] = useState<{
    temperature: number;
    humidity: number;
    soil_moisture: number;
    ph: number;
  }>({
    temperature: 28.0,
    humidity: 72.0,
    soil_moisture: 58.0,
    ph: 6.5,
  });

  // ── Fetch live sensor data on mount ────────────────
  useEffect(() => {
    console.log("🔧 [CameraPreview] useEffect: fetching sensor data...");
    let active = true;
    const fetchSensorData = async () => {
      try {
        console.log("🔧 [CameraPreview] Calling sensorApi.listNodes()...");
        const nodes = await sensorApi.listNodes();
        console.log("🔧 [CameraPreview] listNodes returned:", nodes?.length, "nodes");
        console.log("🔧 [CameraPreview] Nodes data:", JSON.stringify(nodes));
        if (nodes && nodes.length > 0) {
          console.log("🔧 [CameraPreview] Calling getReadings for node:", nodes[0].id);
          const readings = await sensorApi.getReadings(nodes[0].id, 1);
          console.log("🔧 [CameraPreview] getReadings returned:", readings?.length, "readings");
          if (active && readings && readings.length > 0) {
            const latest = readings[0];
            console.log("🔧 [CameraPreview] Latest reading:", JSON.stringify(latest));
            setSensorData({
              temperature: latest.temperature ?? 28.0,
              humidity: latest.humidity ?? 72.0,
              soil_moisture: latest.soil_moisture ?? 58.0,
              ph: latest.ph ?? 6.5,
            });
          } else {
            console.log("🔧 [CameraPreview] No readings found, keeping defaults");
          }
        } else {
          console.log("🔧 [CameraPreview] No sensor nodes found, keeping defaults");
        }
      } catch (err) {
        console.warn("🔧 [CameraPreview] ⚠️ Failed to fetch live sensor data:", err);
        console.warn("🔧 [CameraPreview] ⚠️ Error type:", typeof err);
        console.warn("🔧 [CameraPreview] ⚠️ Error string:", String(err));
      }
    };
    fetchSensorData();
    return () => {
      console.log("🔧 [CameraPreview] useEffect cleanup");
      active = false;
    };
  }, []);
  // ───────────────────────────────────────────────────

  const handleAnalyze = async () => {
    console.log("🔧 [CameraPreview] ====== ANALYZE BUTTON PRESSED ======");
    console.log("🔧 [CameraPreview] Mode:", mode);
    console.log("🔧 [CameraPreview] Current photo URI:", current);
    console.log("🔧 [CameraPreview] Current photo URI length:", current?.length);
    console.log("🔧 [CameraPreview] Sensor data being used:", JSON.stringify(sensorData));
    console.log("🔧 [CameraPreview] CropId:", cropId);

    setLoading(true);
    try {
      if (mode === 'grading') {
        const id = cropId ?? '00000000-0000-0000-0000-000000000000';
        console.log("🔧 [CameraPreview] GRADE mode — calling aiApi.gradeCrop with id:", id);
        console.log("🔧 [CameraPreview] About to POST to /ai/grade/{cropId} with image URI:", current);

        const result = await aiApi.gradeCrop(id, current);

        console.log("🔧 [CameraPreview] GRADE result:", JSON.stringify(result));

        // Fetch LLM insight for grading (non-blocking enhancement)
        let insight = '';
        try {
          console.log("🔧 [CameraPreview] Fetching grading insight...");
          insight = await aiApi.getGradingInsight(
            result.grade,
            result.confidence,
            result.grade_a_prob,
            result.grade_b_prob,
            result.grade_c_prob,
            sensorData,
          );
          console.log("🔧 [CameraPreview] Grading insight received, length:", insight?.length);
        } catch (err) {
          console.warn("🔧 [CameraPreview] Grading insight fetch failed:", err);
        }

        console.log("🔧 [CameraPreview] Navigating to DiagnosisDetail with grade result");
        navigation.navigate('DiagnosisDetail', { result, mode, imageUri: current, insight, sensorData });
      } else {
        console.log("🔧 [CameraPreview] DIAGNOSE mode — calling aiApi.diagnose with URI:", current);
        console.log("🔧 [CameraPreview] About to POST to /ai/diagnose with image URI:", current);

        const result = await aiApi.diagnose(current);

        console.log("🔧 [CameraPreview] DIAGNOSE result:", JSON.stringify(result));
        console.log("🔧 [CameraPreview]   disease_name:", result.disease_name);
        console.log("🔧 [CameraPreview]   confidence:", result.confidence);
        console.log("🔧 [CameraPreview]   is_healthy:", result.is_healthy);
        console.log("🔧 [CameraPreview]   recommendation:", result.recommendation);

        // Fetch LLM insight for disease (non-blocking enhancement)
        let insight = '';
        try {
          console.log("🔧 [CameraPreview] Fetching disease insight...");
          insight = await aiApi.getDiseaseInsight(
            result.disease_name,
            result.confidence,
            result.is_healthy,
            sensorData,
          );
          console.log("🔧 [CameraPreview] Disease insight received, length:", insight?.length);
        } catch (err) {
          console.warn("🔧 [CameraPreview] Disease insight fetch failed:", err);
        }

        console.log("🔧 [CameraPreview] Navigating to DiagnosisDetail with diagnosis result");
        navigation.navigate('DiagnosisDetail', { result, mode, imageUri: current, insight, sensorData });
      }
    } catch (err: any) {
      // ── DEBUG: Log every detail of the error ──
      console.error("🔧 [CameraPreview] ❌❌❌ ANALYZE FAILED ❌❌❌");
      console.error("🔧 [CameraPreview] Error type:", typeof err);
      console.error("🔧 [CameraPreview] Error constructor:", err?.constructor?.name);
      console.error("🔧 [CameraPreview] Error message:", err?.message);
      console.error("🔧 [CameraPreview] Error code:", err?.code);
      console.error("🔧 [CameraPreview] Error stack:", err?.stack);

      // AxiosError specific fields
      if (err?.response) {
        console.error("🔧 [CameraPreview] Axios response status:", err.response.status);
        console.error("🔧 [CameraPreview] Axios response data:", JSON.stringify(err.response.data));
        console.error("🔧 [CameraPreview] Axios response headers:", JSON.stringify(err.response.headers));
      }
      if (err?.config) {
        console.error("🔧 [CameraPreview] Request URL:", err.config?.baseURL + err.config?.url);
        console.error("🔧 [CameraPreview] Request method:", err.config?.method);
        console.error("🔧 [CameraPreview] Request headers:", JSON.stringify(err.config?.headers));
      }
      if (err?.request) {
        console.error("🔧 [CameraPreview] Request object present (network error type):", typeof err.request);
      }
      // ───────────────────────────────────────────

      Alert.alert('Gagal', 'Analisis tidak dapat dilakukan. Periksa koneksi dan coba lagi.');
    } finally {
      console.log("🔧 [CameraPreview] ====== ANALYZE COMPLETE ======");
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
