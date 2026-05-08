import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Theme } from '../theme';

export type CameraMode = 'grading' | 'diagnosis';

export default function CameraScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const insets     = useSafeAreaInsets();

  const mode: CameraMode = route.params?.mode ?? 'diagnosis';
  const cropId: string | undefined = route.params?.cropId;

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permCenter]}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Izin Kamera Diperlukan</Text>
        <Text style={styles.permBody}>Aktifkan izin kamera untuk menggunakan fitur ini.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Berikan Izin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      navigation.navigate('CameraPreview', { uri: photo.uri, mode, cropId });
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mengambil foto. Coba lagi.');
    }
  };

  const title    = mode === 'grading' ? 'Grading Kualitas Panen' : 'Diagnosis Penyakit Tanaman';
  const tipText  = mode === 'grading'
    ? 'Foto sayuran dari jarak dekat, pencahayaan merata'
    : 'Foto bagian tanaman yang bergejala (daun/batang)';

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={facing} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>{title}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setFacing((f) => f === 'back' ? 'front' : 'back')}>
          <Text style={styles.iconBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Viewfinder overlay */}
      <View style={styles.viewfinderWrap} pointerEvents="none">
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.tip}>{tipText}</Text>
        <View style={styles.shutterRow}>
          <TouchableOpacity style={styles.galleryBtn} onPress={() => {}}>
            <Text style={styles.galleryIcon}>🖼️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shutter} onPress={takePicture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <View style={{ width: 52 }} />
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICK = 3;
const corner: object = { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: Theme.colors.white, borderWidth: CORNER_THICK };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permCenter: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  permIcon:  { fontSize: 64, marginBottom: 16 },
  permTitle: { fontSize: Theme.font.sizeXl, fontWeight: Theme.font.weightBold, color: Theme.colors.textPrimary, textAlign: 'center' },
  permBody:  { fontSize: Theme.font.sizeSm, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  permBtn:   { backgroundColor: Theme.colors.grass[600], paddingHorizontal: 32, paddingVertical: 14, borderRadius: Theme.radius.md },
  permBtnText: { color: Theme.colors.white, fontWeight: Theme.font.weightSemibold },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topTitle:    { color: Theme.colors.white, fontSize: Theme.font.sizeMd, fontWeight: Theme.font.weightSemibold },
  iconBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 20 },

  viewfinderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { width: 260, height: 260, position: 'relative' },
  corner:   corner as any,
  cornerTL: { top: 0, left: 0,    borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0,   borderLeftWidth: 0,  borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0,borderLeftWidth: 0,  borderTopWidth: 0 },

  bottomBar: { backgroundColor: 'rgba(0,0,0,0.6)', paddingTop: 16, paddingHorizontal: Theme.spacing.lg },
  tip: { color: 'rgba(255,255,255,0.7)', fontSize: Theme.font.sizeXs, textAlign: 'center', marginBottom: 20 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  galleryBtn: { width: 52, height: 52, borderRadius: Theme.radius.md, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  galleryIcon: { fontSize: 26 },
  shutter: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Theme.colors.transparent,
    borderWidth: 4, borderColor: Theme.colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Theme.colors.white },
});
