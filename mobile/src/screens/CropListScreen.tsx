import React, { useCallback, useState } from "react";
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import StateView from "../components/StateView";
import { getUploadUrl, marketplaceApi } from "../services/api";
import type { Crop, User } from "../types";
import { formatCurrency, formatKg } from "../utils/format";

export default function CropListScreen() {
  const navigation = useNavigation<any>();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const rawUser = await SecureStore.getItemAsync("user");
      const user: User | null = rawUser ? JSON.parse(rawUser) : null;
      const all = await marketplaceApi.listCrops(false);
      setCrops(user?.role === "admin" ? all : all.filter((crop) => crop.farmer_id === user?.id));
    } catch {
      setError("Produk belum bisa dimuat. Periksa koneksi backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const onDelete = (crop: Crop) => {
    Alert.alert("Hapus produk", `Hapus ${crop.name}? Produk dengan pesanan aktif tidak dapat dihapus.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await marketplaceApi.deleteCrop(crop.id);
            await load();
          } catch (err: any) {
            Alert.alert("Gagal", err?.response?.status === 409 ? "Produk masih memiliki pesanan aktif." : "Produk belum bisa dihapus.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0e4719" />
        </TouchableOpacity>
        <Text style={styles.title}>Produk Saya</Text>
        <View style={styles.iconSpace} />
      </View>

      {loading ? (
        <StateView title="Memuat produk..." loading />
      ) : error ? (
        <StateView title="Produk gagal dimuat" message={error} actionLabel="Coba lagi" onAction={load} />
      ) : crops.length === 0 ? (
        <StateView title="Belum ada produk" message="Tambahkan komoditas pertama untuk mulai mengelola katalog." actionLabel="Tambah Produk" onAction={() => navigation.navigate("CropForm")} />
      ) : (
        <FlatList
          data={crops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => {
            const imageUrl = getUploadUrl(item.image_url);
            return (
              <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("CropDetail", { cropId: item.id })} activeOpacity={0.85}>
                {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} /> : <View style={styles.imagePlaceholder}><Ionicons name="image-outline" size={26} color="#71af7d" /></View>}
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{formatKg(item.quantity_kg)} · Grade {item.grade}</Text>
                  <Text style={styles.price}>{formatCurrency(item.price_per_kg)}/kg</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color="#923333" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
      <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("CropForm")} activeOpacity={0.85}>
        <Text style={styles.addText}>Tambah</Text>
        <Ionicons name="add" size={24} color="#fbf2d4" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffefb" },
  header: { paddingTop: 58, paddingHorizontal: 14, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 25, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#dbe3dd", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#0e4719" },
  iconSpace: { width: 40 },
  addBtn: {
    position: "absolute",
    right: 18,
    bottom: 24,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#0e4719",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  addText: { fontSize: 16, fontFamily: "Lato_400Regular", color: "#fbf2d4", fontWeight: "700" },
  list: { padding: 14, paddingBottom: 96, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: "#f3f8f1", borderWidth: 1, borderColor: "#ccd9ce", padding: 12 },
  image: { width: 72, height: 72, borderRadius: 14, backgroundColor: "#e7ede8" },
  imagePlaceholder: { width: 72, height: 72, borderRadius: 14, backgroundColor: "#e7ede8", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  meta: { fontSize: 12, fontFamily: "Lato_400Regular", color: "#55835e" },
  price: { fontSize: 14, fontFamily: "FacultyGlyphic_400Regular", color: "#0e4719" },
  deleteBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff0f0", alignItems: "center", justifyContent: "center" },
});
