import React, { useRef, useState, useEffect } from 'react';
import {
  View, Image, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

export type CameraMode = 'grading' | 'diagnosis';

const GUIDE_W = 280;
const GUIDE_H = 400;
const CORNER_LEN = 28;
const CORNER_THICK = 3;

export default function CameraScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const mode: CameraMode = route.params?.mode ?? 'diagnosis';
  const cropId: string | undefined = route.params?.cropId;

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permCenter]}>
        <Ionicons name="camera-outline" size={64} color="#0e4719" />
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
      setLastPhoto(photo.uri);
      navigation.navigate('CameraPreview', { uri: photo.uri, mode, cropId });
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mengambil foto. Coba lagi.');
    }
  };

  const hint = mode === 'grading'
    ? 'Foto sayuran dari jarak dekat dengan pencahayaan merata'
    : 'Arahkan ke bagian tanaman yang bergejala (daun / batang)';

  return (
    <View style={styles.container}>
      {/* Camera viewfinder */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={facing} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fbf2d4" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        >
          <Ionicons name="camera-reverse-outline" size={24} color="#0e4719" />
        </TouchableOpacity>
      </View>

      {/* Viewfinder guide overlay — fills space between top bar and bottom bar */}
      <View style={styles.viewfinderArea} pointerEvents="none">
        {/* Top dim band */}
        <View style={styles.dimBand} />

        {/* Middle row: dim | guide box | dim */}
        <View style={styles.middleRow}>
          <View style={styles.dimSide} />

          <View style={styles.guideBox}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <View style={styles.dimSide} />
        </View>

        {/* Hint text */}
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>

        {/* Bottom dim band */}
        <View style={styles.dimBand} />
      </View>

      {/* Bottom controls bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.controls}>
          {/* Thumbnail of last photo */}
          <View style={styles.thumbnailWrapper}>
            <View style={styles.thumbnailShadow} />
            {lastPhoto ? (
              <Image source={{ uri: lastPhoto }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.thumbnailPlaceholder} />
            )}
          </View>

          {/* Shutter button */}
          <LinearGradient
            style={styles.shutterOuter}
            locations={[0, 1]}
            colors={['#0e4719', '#062f0e']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity onPress={takePicture} activeOpacity={0.8}>
              <LinearGradient
                style={styles.shutterInner}
                locations={[0, 0.42]}
                colors={['#a69e84', '#fbf2d4']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                <Image
                  style={styles.cameraIcon}
                  resizeMode="cover"
                  source={require('../../assets/icons/icon-camera.png')}
                />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          {/* Confirm / go to preview */}
          <TouchableOpacity
            style={[styles.checklistBtn, !lastPhoto && styles.checklistBtnDisabled]}
            activeOpacity={0.8}
            onPress={() =>
              lastPhoto && navigation.navigate('CameraPreview', { uri: lastPhoto, mode, cropId })
            }
          >
            <Ionicons name="checkmark" size={36} color={lastPhoto ? '#fbf2d4' : '#44694b'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  /* ── Permission screen ── */
  permCenter: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permTitle: {
    fontSize: 20,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#0e4719',
    textAlign: 'center',
    marginTop: 16,
  },
  permBody: {
    fontSize: 14,
    fontFamily: 'FacultyGlyphic_400Regular',
    color: '#44694b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  permBtn: {
    backgroundColor: '#0e4719',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permBtnText: {
    color: '#fbf2d4',
    fontFamily: 'FacultyGlyphic_400Regular',
    fontSize: 16,
  },

  /* ── Top bar ── */
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 43,
    height: 43,
    borderRadius: 8,
    backgroundColor: '#0e4719',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtn: {
    width: 43,
    height: 43,
    borderRadius: 8,
    backgroundColor: '#e7ede8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Viewfinder guide overlay ── */
  viewfinderArea: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  dimBand: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  middleRow: {
    flexDirection: 'row',
    height: GUIDE_H,
  },
  dimSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  guideBox: {
    width: GUIDE_W,
    height: GUIDE_H,
  },
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: '#fbf2d4',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderBottomRightRadius: 4,
  },
  hintRow: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(251,242,212,0.85)',
    fontSize: 13,
    fontFamily: 'FacultyGlyphic_400Regular',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  /* ── Bottom bar ── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fefbf2',
    borderTopWidth: 1,
    borderTopColor: '#0e4719',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  controls: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbnailWrapper: {
    width: 78,
    height: 63,
  },
  thumbnailShadow: {
    position: 'absolute',
    top: 7,
    left: 8,
    width: 70,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#0e4719',
  },
  thumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 56,
    borderRadius: 4,
  },
  thumbnailPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#d9d9d9',
  },
  shutterOuter: {
    width: 91,
    height: 71,
    borderRadius: 13,
    paddingTop: 6,
    paddingBottom: 7,
    paddingHorizontal: 9,
    alignItems: 'flex-start',
  },
  shutterInner: {
    width: 71,
    height: 57,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    width: 43,
    height: 43,
  },
  checklistBtn: {
    width: 70,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0e4719',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistBtnDisabled: {
    backgroundColor: '#c8d4c9',
  },
});
