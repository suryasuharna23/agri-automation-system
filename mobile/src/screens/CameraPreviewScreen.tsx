import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { aiApi } from '../services/api';
import type { CameraMode } from './CameraScreen';

export default function CameraPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const mode: CameraMode = route.params?.mode ?? 'diagnosis';
  const cropId: string | undefined = route.params?.cropId;

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

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      if (mode === 'grading') {
        const id = cropId ?? '00000000-0000-0000-0000-000000000000';
        const result = await aiApi.gradeCrop(id, current);
        navigation.replace('DiagnosisDetail', { result, mode, imageUri: current });
      } else {
        const result = await aiApi.diagnose(current);
        navigation.replace('DiagnosisDetail', { result, mode, imageUri: current });
      }
    } catch {
      Alert.alert('Gagal', 'Analisis tidak dapat dilakukan. Periksa koneksi dan coba lagi.');
    } finally {
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
