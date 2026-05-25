import React, { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import StateView from "../components/StateView";
import { getUploadUrl, marketplaceApi } from "../services/api";
import type { Crop } from "../types";
import { formatCurrency, formatDate, formatKg } from "../utils/format";

export default function CropDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cropId: string = route.params?.cropId;
  const [crop, setCrop] = useState<Crop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setCrop(await marketplaceApi.getCrop(cropId));
    } catch {
      setError("Detail produk belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }, [cropId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const onDelete = () => {
    if (!crop) return;
    Alert.alert("Hapus produk", `Hapus ${crop.name}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await marketplaceApi.deleteCrop(crop.id);
            navigation.goBack();
          } catch (err: any) {
            Alert.alert("Gagal", err?.response?.status === 409 ? "Produk masih memiliki pesanan aktif." : "Produk belum bisa dihapus.");
          }
        },
      },
    ]);
  };

  if (loading) return <StateView title="Memuat detail..." loading />;
  if (error || !crop) return <StateView title="Produk tidak ditemukan" message={error} actionLabel="Kembali" onAction={() => navigation.goBack()} />;

  const imageUrl = getUploadUrl(crop.image_url);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0e4719" />
        </TouchableOpacity>
        <Text style={styles.title}>Detail Produk</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("CropForm", { cropId: crop.id })}>
          <Ionicons name="create-outline" size={20} color="#0e4719" />
        </TouchableOpacity>
      </View>

      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.hero} /> : <View style={styles.heroPlaceholder}><Ionicons name="image-outline" size={46} color="#71af7d" /></View>}
      <View style={styles.card}>
        <Text style={styles.name}>{crop.name}</Text>
        <Text style={styles.sub}>{crop.variety || "Tanpa varietas"} · Grade {crop.grade}</Text>
        <Text style={styles.price}>{formatCurrency(crop.price_per_kg)}/kg</Text>
        <Info label="Stok" value={formatKg(crop.quantity_kg)} />
        <Info label="Tanggal panen" value={formatDate(crop.harvest_date)} />
        <Info label="Status" value={crop.is_available ? "Tampil di marketplace" : "Disembunyikan"} />
        <Text style={styles.desc}>{crop.description || "Belum ada deskripsi."}</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("Camera", { mode: "grading", cropId: crop.id })}>
        <Ionicons name="camera-outline" size={18} color="#fbf2d4" />
        <Text style={styles.primaryText}>Grade crop dengan kamera</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dangerBtn} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color="#923333" />
        <Text style={styles.dangerText}>Hapus produk</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffefb" },
  content: { padding: 14, paddingTop: 48, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#dbe3dd", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0e4719" },
  hero: { width: "100%", height: 220, borderRadius: 18, backgroundColor: "#e7ede8" },
  heroPlaceholder: { width: "100%", height: 220, borderRadius: 18, backgroundColor: "#e7ede8", alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 18, backgroundColor: "#f3f8f1", borderWidth: 1, borderColor: "#ccd9ce", padding: 16, gap: 10 },
  name: { fontSize: 25, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  sub: { fontSize: 13, fontFamily: "Lato_400Regular", color: "#55835e" },
  price: { fontSize: 20, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  infoLabel: { fontSize: 13, fontFamily: "FacultyGlyphic_400Regular", color: "#7a9a7e" },
  infoValue: { flex: 1, textAlign: "right", fontSize: 13, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  desc: { fontSize: 13, fontFamily: "Lato_400Regular", color: "#1a3d1f", lineHeight: 20, textAlign: "justify" },
  primaryBtn: { height: 48, borderRadius: 14, backgroundColor: "#0e4719", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { fontSize: 14, fontFamily: "Lato_400Regular", color: "#fbf2d4" },
  dangerBtn: { height: 48, borderRadius: 14, backgroundColor: "#fff0f0", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#f5c5c5" },
  dangerText: { fontSize: 14, fontFamily: "Lato_400Regular", color: "#923333" },
});
