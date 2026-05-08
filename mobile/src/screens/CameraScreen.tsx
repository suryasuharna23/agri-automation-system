import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRoute, useNavigation } from "@react-navigation/native";
import { aiApi } from "../services/api";
import type { GradingResult, DiagnosisResult } from "../types";

type Mode = "grading" | "diagnosis";

export default function CameraScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const mode: Mode = route.params?.mode ?? "diagnosis";
  const cropId: string | undefined = route.params?.cropId;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | DiagnosisResult | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return Alert.alert("Izin Diperlukan", "Izinkan akses kamera untuk melanjutkan.");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const analyze = async () => {
    if (!imageUri) return;
    setLoading(true);
    try {
      if (mode === "grading") {
        const id = cropId ?? "00000000-0000-0000-0000-000000000000";
        const r = await aiApi.gradeCrop(id, imageUri);
        setResult(r);
      } else {
        const r = await aiApi.diagnose(imageUri);
        setResult(r);
      }
    } catch {
      Alert.alert("Error", "Analisis gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === "grading" ? "Grading Kualitas Panen" : "Diagnosis Penyakit Tanaman"}</Text>

      <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>Ketuk untuk mengambil foto</Text>
        )}
      </TouchableOpacity>

      {imageUri && !result && (
        <TouchableOpacity style={styles.analyzeBtn} onPress={analyze} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeBtnText}>Analisis Sekarang</Text>}
        </TouchableOpacity>
      )}

      {result && mode === "grading" && (
        <GradingResultCard result={result as GradingResult} />
      )}
      {result && mode === "diagnosis" && (
        <DiagnosisResultCard result={result as DiagnosisResult} />
      )}
    </View>
  );
}

function GradingResultCard({ result }: { result: GradingResult }) {
  const gradeColor = { A: "#16a34a", B: "#ca8a04", C: "#ea580c" }[result.grade] ?? "#6b7280";
  return (
    <View style={styles.resultCard}>
      <Text style={[styles.grade, { color: gradeColor }]}>Grade {result.grade}</Text>
      <Text style={styles.confidence}>Keyakinan: {(result.confidence * 100).toFixed(1)}%</Text>
      <View style={styles.probRow}>
        <ProbBar label="A" value={result.grade_a_prob} />
        <ProbBar label="B" value={result.grade_b_prob} />
        <ProbBar label="C" value={result.grade_c_prob} />
      </View>
    </View>
  );
}

function DiagnosisResultCard({ result }: { result: DiagnosisResult }) {
  return (
    <View style={styles.resultCard}>
      <Text style={[styles.grade, { color: result.is_healthy ? "#16a34a" : "#ef4444" }]}>
        {result.disease_name}
      </Text>
      <Text style={styles.confidence}>Keyakinan: {(result.confidence * 100).toFixed(1)}%</Text>
      <Text style={styles.recommendation}>{result.recommendation}</Text>
    </View>
  );
}

function ProbBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 12, color: "#6b7280" }}>Grade {label}</Text>
      <Text style={{ fontWeight: "bold", color: "#2d6a4f" }}>{(value * 100).toFixed(0)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8faf8", padding: 16 },
  title: { fontSize: 18, fontWeight: "bold", color: "#2d6a4f", marginBottom: 16 },
  imageBox: { height: 280, backgroundColor: "#e5e7eb", borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 16, overflow: "hidden" },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { color: "#9ca3af", fontSize: 14 },
  analyzeBtn: { backgroundColor: "#2d6a4f", borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 16 },
  analyzeBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  resultCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  grade: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  confidence: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 12 },
  probRow: { flexDirection: "row", justifyContent: "space-around" },
  recommendation: { fontSize: 14, color: "#374151", lineHeight: 20, marginTop: 8 },
});
